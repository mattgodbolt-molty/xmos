import { describe, it, expect } from "vitest";
import { bootWithXmos, runCommand } from "./xmos-test-machine.js";

describe("*HELP XMOS", () => {
    it("should list all XMOS commands", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*HELP XMOS");

        expect(output).toContain("MOS Extension commands:");
        const commands = [
            "ALIAS", "ALIASES", "ALICLR", "ALILD", "ALISV",
            "BAU", "DEFKEYS", "DIS", "KEYON", "KEYOFF",
            "KSTATUS", "LVAR", "MEM", "SPACE", "STORE",
            "XON", "XOFF",
        ];
        for (const cmd of commands) {
            expect(output).toContain(cmd);
        }
    });

    it("should include L and S commands", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*HELP XMOS");

        expect(output).toContain("L        Selects mode 128");
        expect(output).toContain("S        Saves BASIC with incore name");
    });
});

describe("*HELP", () => {
    it("should include MOS Extension in the general help listing", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*HELP");

        expect(output).toContain("MOS Extension");
        expect(output).toContain("XMOS");
        expect(output).toContain("FEATURES");
    });
});

describe("*HELP FEATURES", () => {
    it("should describe the extended input features", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*HELP FEATURES");

        expect(output).toContain("In addition to the commands");
        expect(output).toContain("arrow keys");
        expect(output).toContain("cursor");
        expect(output).toContain("COPY");
        expect(output).toContain("TAB");
        expect(output).toContain("SHIFT");
    });
});

describe("abbreviated commands", () => {
    it("*H. XMOS should work as *HELP XMOS", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*H. XMOS");

        expect(output).toContain("MOS Extension commands:");
        expect(output).toContain("ALIAS");
    });

    it("*HELP X. should match XMOS", async () => {
        const machine = await bootWithXmos();
        const output = await runCommand(machine, "*HELP X.");

        // The MOS dispatches *HELP to all ROMs; XMOS should respond to "X."
        expect(output).toContain("MOS Extension");
    });
});
