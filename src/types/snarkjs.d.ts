declare module 'snarkjs' {
  interface Groth16Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  interface Groth16Module {
    fullProve(
      input: Record<string, unknown>,
      wasm: Uint8Array | ArrayBuffer | string,
      zkey: Uint8Array | ArrayBuffer | string
    ): Promise<{
      proof: Groth16Proof;
      publicSignals: string[];
    }>;
    verify(
      vkey: unknown,
      publicSignals: string[],
      proof: Groth16Proof
    ): Promise<boolean>;
  }

  export const groth16: Groth16Module;
}
