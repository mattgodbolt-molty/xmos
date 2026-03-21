\ ============================================================================
\ XMOS — Assembly Macros
\ ============================================================================

\ Print a null-terminated string at a given address using OSASCI
\ Clobbers A, X
MACRO STROUT addr
{
    LDX #&00
.loop
    LDA addr,X
    BEQ done
    JSR osasci
    INX
    BNE loop
.done
}
ENDMACRO

\ DIS opcode table entry: valid opcode with mnemonic and addressing mode
MACRO OP mnem, mode
    EQUS mnem : EQUB mode
ENDMACRO

\ DIS opcode table entry: invalid/undefined opcode
MACRO NOOP
    EQUB &00, &00, &00, &00
ENDMACRO
