/**
 * Shared test helper: boots a BBC Master with XMOS loaded into SWRAM slot 7.
 *
 * Usage:
 *   import { bootWithXmos, captureOutput } from "./xmos-test-machine.js";
 *   const machine = await bootWithXmos();
 *   const getOutput = captureOutput(machine);
 *   await machine.type("*HELP XMOS");
 *   await machine.runFor(4_000_000);
 *   expect(getOutput()).toContain("MOS Extension");
 */

import { TestMachine } from "jsbeeb/tests/test-machine.js";
import { setNodeBasePath } from "jsbeeb/src/utils.js";
import * as fdc from "jsbeeb/src/fdc.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsbeebBase = path.join(__dirname, "..", "node_modules", "jsbeeb");
setNodeBasePath(jsbeebBase);

const ssdPath = path.join(__dirname, "..", "original.ssd");

/**
 * Boot a BBC Master with XMOS loaded and active.
 * Returns a jsbeeb TestMachine ready for command input.
 */
export async function bootWithXmos() {
    const machine = new TestMachine("Master");
    await machine.initialise();

    const data = fs.readFileSync(ssdPath);
    machine.processor.fdc.loadDisc(0, fdc.discFor(machine.processor.fdc, "", data));

    await machine.runUntilInput();
    await machine.type("*SRLOAD XMOS 8000 7Q");
    await machine.runUntilInput();

    // Hard reset (CTRL+BREAK) so the MOS re-scans ROM slots
    // and recognises the newly loaded SWRAM contents.
    // A soft reset (BREAK) skips the ROM scan.
    machine.processor.reset(true);
    await machine.runUntilInput();

    return machine;
}

/**
 * Install a text capture hook on the machine.
 * Returns a function that, when called, returns all captured text so far.
 */
export function captureOutput(machine) {
    let output = "";
    machine.captureText((elem) => (output += elem.text));
    return () => output;
}

/**
 * Type a command, run until output settles, and return the response text.
 * Captures everything (including the typed echo) then strips the echo prefix.
 * The capture hook must be installed *before* type() because type() runs
 * the CPU and the MOS may start producing output during keystroke processing.
 *
 * SHIFT is held during the output phase so the MOS doesn't pause with
 * "Shift for more" when output fills the screen.
 */
export async function runCommand(machine, command, cycles = 8_000_000) {
    const getOutput = captureOutput(machine);
    await machine.type(command);
    // Hold SHIFT so paged output scrolls without pausing
    machine.processor.sysvia.keyDown(16);
    await machine.runFor(cycles);
    machine.processor.sysvia.keyUp(16);
    const raw = getOutput();
    // Strip the typed echo (command + RETURN) from the start of the output.
    // The echo appears as the command text (without the leading ">") followed
    // by the response. Find the command text and skip past it.
    const echoEnd = raw.indexOf(command);
    if (echoEnd >= 0) {
        return raw.slice(echoEnd + command.length);
    }
    return raw;
}
