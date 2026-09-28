// Minimal WebHID typings (the DOM lib does not ship them yet)

interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

interface HIDCollectionInfo {
  usagePage: number;
  usage: number;
}

interface HIDInputReportEvent extends Event {
  readonly device: HIDDevice;
  readonly reportId: number;
  readonly data: DataView;
}

interface HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: HIDCollectionInfo[];
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  addEventListener(type: "inputreport", listener: (e: HIDInputReportEvent) => void): void;
  removeEventListener(type: "inputreport", listener: (e: HIDInputReportEvent) => void): void;
}

interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice;
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options: { filters: HIDDeviceFilter[] }): Promise<HIDDevice[]>;
  addEventListener(type: "connect" | "disconnect", listener: (e: HIDConnectionEvent) => void): void;
  removeEventListener(type: "connect" | "disconnect", listener: (e: HIDConnectionEvent) => void): void;
}

interface Navigator {
  readonly hid?: HID;
}
