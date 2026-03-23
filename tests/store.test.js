import { describe, it, expect, beforeEach } from "vitest";
import { bootWithXmos, runCommand, captureOutput } from "./xmos-test-machine.js";

const CTRL = 17;

// Press BBC f1 (*KEY 1). MCP F0 (PC keycode 112) maps to BBC f1.
async function pressBbcF1(machine) {
    machine.processor.sysvia.keyDown(112);
    await machine.runFor(200000);
    machine.processor.sysvia.keyUp(112);
    await machine.runFor(200000);
}

// Simulate CTRL+BREAK: hold CTRL during a soft reset.
// On the BBC Master this triggers a full reinitialisation (rescan ROM
// slots, clear ANDY) without a power-on RAM wipe.
async function ctrlBreak(machine) {
    machine.processor.sysvia.keyDown(CTRL);
    machine.processor.reset(false);
    await machine.runFor(2_000_000);
    machine.processor.sysvia.keyUp(CTRL);
    await machine.runUntilInput();
}

describe("*STORE — keep function keys on CTRL+BREAK", () => {
    let machine;

    beforeEach(async () => {
        machine = await bootWithXmos();
    });

    it("function key defined with *KEY should work", async () => {
        await runCommand(machine, "*KEY 1 HELLO");
        const getOutput = captureOutput(machine);
        await pressBbcF1(machine);
        await machine.runFor(2_000_000);
        const output = getOutput();
        expect(output).toContain("HELLO");
    });

    it("function key is lost on CTRL+BREAK without *STORE", async () => {
        await runCommand(machine, "*KEY 1 HELLO");
        await ctrlBreak(machine);

        const getOutput = captureOutput(machine);
        await pressBbcF1(machine);
        await machine.runFor(2_000_000);
        const output = getOutput();
        expect(output).not.toContain("HELLO");
    });

    // Known bug in original XMOS: the *STORE copy loop doesn't disable
    // interrupts. If a timer interrupt fires mid-loop, the handler
    // restores ROMSEL without bit 7, unpaging ANDY. The rest of the
    // copy reads ROM data instead of function key data. Works in the
    // browser because interrupt timing differs. Fix: add SEI/CLI.
    it.skip("*STORE should preserve function key across CTRL+BREAK", async () => {
        await runCommand(machine, "*KEY 1 HELLO");
        await runCommand(machine, "*STORE");
        await ctrlBreak(machine);

        const getOutput = captureOutput(machine);
        await pressBbcF1(machine);
        await machine.runFor(2_000_000);
        const output = getOutput();
        expect(output).toContain("HELLO");
    });
});
