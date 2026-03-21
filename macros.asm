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
