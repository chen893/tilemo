declare module "qrcode-generator" {
  export interface QRCode {
    addData(data: string, mode?: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
  }
  /** typeNumber 0 = 自动；level: L/M/Q/H。 */
  export default function qrcode(
    typeNumber: number,
    errorCorrectionLevel: "L" | "M" | "Q" | "H",
  ): QRCode;
}
