import { describe, it, expect } from "vitest";
import { bootWithXmos, runCommand } from "./xmos-test-machine.js";

describe("*ALIAS / *ALIASES / *ALICLR", () => {
    it("*ALIASES should be silent when no aliases defined", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*ALIASES");
        expect(output.trim()).toBe("");
    });

    it("*ALIAS should define an alias visible in *ALIASES", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "*ALIAS FOO *CAT");
        const output = await runCommand(machine, "*ALIASES");
        expect(output).toContain("FOO");
        expect(output).toContain("*CAT");
    });

    it("should support multiple aliases", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "*ALIAS FOO *CAT");
        await runCommand(machine, "*ALIAS BAR *DIR");
        const output = await runCommand(machine, "*ALIASES");
        expect(output).toContain("FOO");
        expect(output).toContain("BAR");
    });

    it("*ALICLR should clear all aliases", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "*ALIAS FOO *CAT");
        await runCommand(machine, "*ALIAS BAR *DIR");
        await runCommand(machine, "*ALICLR");
        const output = await runCommand(machine, "*ALIASES");
        expect(output.trim()).toBe("");
    });

    // TODO: alias expansion test — *LS expanding to *CAT works (verified
    // interactively via MCP screenshot) but the text capture doesn't pick up
    // output from the nested OSCLI call. Needs investigation into how
    // captureText interacts with re-entrant command dispatch.
});
