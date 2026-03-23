import { describe, it, expect, beforeEach } from "vitest";
import { bootWithXmos, runCommand, captureOutput } from "./xmos-test-machine.js";

// Press BBC f1 (*KEY 1). MCP F0 (PC keycode 112) maps to BBC f1.
async function pressBbcF1(machine) {
    machine.processor.sysvia.keyDown(112);
    await machine.runFor(200000);
    machine.processor.sysvia.keyUp(112);
    await machine.runFor(200000);
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

    it("function key is lost on soft reset (BREAK) without *STORE", async () => {
        // The MOS reinitialises the ANDY function key buffer on reset
        await runCommand(machine, "*KEY 1 HELLO");
        machine.processor.reset(false);
        await machine.runUntilInput();

        const getOutput = captureOutput(machine);
        await pressBbcF1(machine);
        await machine.runFor(2_000_000);
        const output = getOutput();
        expect(output).not.toContain("HELLO");
    });

    it("function key is lost on hard reset (CTRL+BREAK) without *STORE", async () => {
        await runCommand(machine, "*KEY 1 HELLO");
        // Hard reset clears ANDY
        machine.processor.reset(true);
        await machine.runUntilInput();

        const getOutput = captureOutput(machine);
        await pressBbcF1(machine);
        await machine.runFor(2_000_000);
        const output = getOutput();
        expect(output).not.toContain("HELLO");
    });

    // *STORE saves ANDY (function key buffer) to HAZEL store buffers.
    // alias_init restores from HAZEL on reset, preserving keys across
    // CTRL+BREAK. However, this doesn't work in jsbeeb — the store
    // buffer ends up with ROM data instead of ANDY data despite the
    // mapping appearing correct. See JOURNAL.md for investigation.
    it.skip("*STORE should preserve function key across CTRL+BREAK (jsbeeb issue)", async () => {
        await runCommand(machine, "*KEY 1 HELLO");
        await runCommand(machine, "*STORE");
        machine.processor.reset(true);
        await machine.runUntilInput();

        const getOutput = captureOutput(machine);
        await pressBbcF1(machine);
        await machine.runFor(2_000_000);
        const output = getOutput();
        expect(output).toContain("HELLO");
    });
});
