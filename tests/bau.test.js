import { describe, it, expect } from "vitest";
import { bootWithXmos, runCommand } from "./xmos-test-machine.js";

describe("*BAU — break apart utility", () => {
    it("should split multi-statement lines", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, '10 PRINT "A":PRINT "B":PRINT "C"');

        await runCommand(machine, "*BAU");
        const output = await runCommand(machine, "LIST");

        // After BAU, each statement should be on its own line
        expect(output).toContain('PRINT "A"');
        expect(output).toContain('PRINT "B"');
        expect(output).toContain('PRINT "C"');
    });

    it("should not split colons inside strings", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, '10 PRINT "A:B":PRINT "C"');

        await runCommand(machine, "*BAU");
        const output = await runCommand(machine, "LIST");

        // The colon inside "A:B" should NOT cause a split
        expect(output).toContain('PRINT "A:B"');
        expect(output).toContain('PRINT "C"');
    });

    it("should leave single-statement lines unchanged", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, '10 PRINT "HELLO"');

        await runCommand(machine, "*BAU");
        const output = await runCommand(machine, "LIST");

        expect(output).toContain('PRINT "HELLO"');
    });

    it("should not split after REM", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "10 REM this:has:colons");

        await runCommand(machine, "*BAU");
        const output = await runCommand(machine, "LIST");

        // REM consumes the rest of the line — colons are part of the comment
        expect(output).toContain("REM this:has:colons");
    });
});

describe("*SPACE — insert keyword spaces", () => {
    it("should insert spaces around keywords", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "10 FORX=1TO10:PRINTX:NEXT");

        await runCommand(machine, "*SPACE");
        const output = await runCommand(machine, "LIST");

        // SPACE should insert spaces after tokenised keywords
        expect(output).toContain("FOR");
        expect(output).toContain("TO");
        expect(output).toContain("PRINT");
        expect(output).toContain("NEXT");
    });

    it("should not modify an empty program", async () => {
        const machine = await bootWithXmos();
        // No program loaded
        await runCommand(machine, "*SPACE");
        const output = await runCommand(machine, "LIST");

        // LIST of empty program just shows the prompt
        expect(output).toBe(">");
    });
});
