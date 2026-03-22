import { describe, it, expect } from "vitest";
import { bootWithXmos, runCommand } from "./xmos-test-machine.js";

describe("*XON / *XOFF", () => {
    it("*XON should not produce an error", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*XON");
        expect(output).not.toContain("Bad command");
    });

    it("*XOFF should not produce an error", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*XOFF");
        expect(output).not.toContain("Bad command");
    });
});

describe("*KEYON / *KEYOFF / *KSTATUS", () => {
    it("*KEYON should report keys are redefined", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*KEYON");
        expect(output).toContain("Keys now redefined");
    });

    it("*KEYOFF should report keys are off", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*KEYOFF");
        expect(output).toContain("Redefined keys off");
    });

    it("*KSTATUS should report off by default", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*KSTATUS");
        expect(output).toContain("Redefined keys off");
    });

    it("*KSTATUS after *KEYON should list key definitions", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "*KEYON");
        const output = await runCommand(machine, "*KSTATUS");

        expect(output).toContain("Redefined keys on, and are:");
        expect(output).toContain("Left");
        expect(output).toContain("Right");
        expect(output).toContain("Up");
        expect(output).toContain("Down");
        expect(output).toContain("Jump/fire");
    });
});
