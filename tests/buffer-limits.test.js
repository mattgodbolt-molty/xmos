import { describe, it, expect, beforeEach } from "vitest";
import { bootWithXmos, runCommand, captureOutput } from "./xmos-test-machine.js";

/**
 * Install a BRK error capture hook. Returns a function that returns
 * the last error message (or null if no error occurred).
 */
function captureBrkError(machine) {
    let errorMsg = null;
    machine.processor.debugInstruction.add((addr) => {
        const brkv = machine.readword(0x0202);
        if (addr === brkv) {
            // The error block is at the address on the stack.
            // The MOS BRK handler reads the error number at (PC)+1
            // and the message at (PC)+2 onwards. But by the time
            // we're at BRKV, the PC that caused the BRK is saved
            // at &FD/&FE. The error block follows the BRK.
            const errPC = machine.readword(0xfd);
            const errNum = machine.readbyte(errPC);
            let msg = "";
            let i = 1;
            while (true) {
                const ch = machine.readbyte(errPC + i);
                if (ch === 0) break;
                msg += String.fromCharCode(ch);
                i++;
            }
            errorMsg = msg;
        }
        return false;
    });
    return () => errorMsg;
}

/**
 * Write an alias entry directly into SWRAM slot 7's alias table.
 * Returns the number of bytes written.
 */
function pokeAlias(machine, tableAddr, name, expansion) {
    const cpu = machine.processor;
    const slot7 = cpu.romOffset + 7 * 16384;
    let off = tableAddr - 0x8000;
    for (let i = 0; i < name.length; i++)
        cpu.ramRomOs[slot7 + off++] = name.charCodeAt(i);
    cpu.ramRomOs[slot7 + off++] = 0; // null after name
    cpu.ramRomOs[slot7 + off++] = 0; // gap byte (alias table format)
    for (let i = 0; i < expansion.length; i++)
        cpu.ramRomOs[slot7 + off++] = expansion.charCodeAt(i);
    cpu.ramRomOs[slot7 + off++] = 0x0d; // CR terminator
    return off - (tableAddr - 0x8000);
}

function pokeSentinel(machine, addr) {
    const cpu = machine.processor;
    const slot7 = cpu.romOffset + 7 * 16384;
    cpu.ramRomOs[slot7 + (addr - 0x8000)] = 0xff;
}

describe("alias table capacity", () => {
    let machine;

    beforeEach(async () => {
        machine = await bootWithXmos();
    });

    it("should report overflow when alias table is full", async () => {
        // The overflow check triggers when zp_ptr_hi >= &BE.
        // Type aliases with long expansions to fill the table.
        const getError = captureBrkError(machine);
        const exp = "X".repeat(200);
        for (let i = 0; i < 20; i++) {
            await runCommand(machine, `*ALIAS Z${i} ${exp}`);
            if (getError()) break;
        }
        expect(getError()).toBe("No room for alias");
    });

    it("poked aliases should be listed correctly", async () => {
        let addr = 0xb165;
        addr += pokeAlias(machine, addr, "HELLO", "CAT");
        addr += pokeAlias(machine, addr, "WORLD", "DIR");
        pokeSentinel(machine, addr);

        const listing = await runCommand(machine, "*ALIASES", { raw: true });
        expect(listing).toContain("HELLO = CAT");
        expect(listing).toContain("WORLD = DIR");
    });

    it("should list all aliases up to the table limit", async () => {
        let addr = 0xb165;
        for (let i = 0; i < 14; i++) {
            addr += pokeAlias(machine, addr, `A${i}`, "X".repeat(220));
        }
        pokeSentinel(machine, addr);

        const listing = await runCommand(machine, "*ALIASES");
        expect(listing).toContain("A0 = ");
        expect(listing).toContain("A13 = ");
    });

    it("*ALICLR should free the entire table", async () => {
        // Fill with several aliases
        for (let i = 0; i < 5; i++) {
            await runCommand(machine, `*ALIAS F${i} *CAT`);
        }
        await runCommand(machine, "*ALICLR");

        // Should be able to add a large alias now
        const bigExpansion = "Y".repeat(200);
        await runCommand(machine, `*ALIAS BIG ${bigExpansion}`);
        const listing = await runCommand(machine, "*ALIASES");
        expect(listing).toContain("BIG = " + bigExpansion);
        expect(listing).not.toContain("F0");
    });
});

describe("alias expansion buffer", () => {
    let machine;

    beforeEach(async () => {
        machine = await bootWithXmos();
    });

    it("should expand a long alias with parameters", async () => {
        await runCommand(machine, "*ALIAS CP *COPY %0 %1 %2");
        const output = await runCommand(machine, "*CP Src Dst Opt");
        expect(output).toContain("*COPY Src Dst Opt");
    });

    it("should handle a long expansion text", async () => {
        const longCmd = "*" + "Z".repeat(80);
        await runCommand(machine, `*ALIAS LONG ${longCmd}`);
        const output = await runCommand(machine, "*LONG");
        expect(output).toContain(longCmd);
    });
});

describe("input line limits", () => {
    it("should handle a long BASIC line", async () => {
        const machine = await bootWithXmos();
        const longLine = "10 REM " + "A".repeat(200);
        await runCommand(machine, longLine);
        const output = await runCommand(machine, "LIST");
        expect(output).toContain("REM");
        expect(output).toContain("AAAA");
    });
});

describe("*LVAR with many variables", () => {
    it("should list many variables of different types", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "AA=1:BB=2:CC=3:DD=4:EE=5");
        await runCommand(machine, 'FF$="hello":GG$="world"');
        await runCommand(machine, "DIM HH(5)");
        const output = await runCommand(machine, "*LVAR");
        expect(output).toContain("AA");
        expect(output).toContain("EE");
        expect(output).toContain("FF$");
        expect(output).toContain("GG$");
        expect(output).toContain("HH(");
    });
});

describe("*DIS across page boundaries", () => {
    it("should disassemble across a page boundary", async () => {
        const machine = await bootWithXmos();
        const getOutput = captureOutput(machine);
        await machine.type("*DIS 80F0");
        machine.keyDown(32);
        await machine.runFor(20_000_000);
        machine.keyUp(32);
        const output = getOutput();
        expect(output).toContain("80F");
        expect(output).toContain("810");
    });
});

describe("*BAU with many split points", () => {
    it("should split a line with 5 colon-separated statements", async () => {
        const machine = await bootWithXmos();
        await runCommand(machine, "10 A=1:B=2:C=3:D=4:E=5");
        await runCommand(machine, "*BAU");
        const output = await runCommand(machine, "LIST");
        expect(output).toContain("A=1");
        expect(output).toContain("B=2");
        expect(output).toContain("C=3");
        expect(output).toContain("D=4");
        expect(output).toContain("E=5");
    });
});
