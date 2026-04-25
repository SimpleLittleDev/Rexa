export interface PointerDriver {
  move(x: number, y: number): Promise<void>;
  click(x: number, y: number): Promise<void>;
}

export interface PointerPosition {
  x: number;
  y: number;
}

export class PointerController {
  private current: PointerPosition = { x: 0, y: 0 };

  constructor(private readonly driver: PointerDriver) {}

  async moveMouse(x: number, y: number): Promise<void> {
    await this.driver.move(x, y);
    this.current = { x, y };
  }

  async click(x = this.current.x, y = this.current.y): Promise<void> {
    await this.driver.click(x, y);
    this.current = { x, y };
  }

  position(): PointerPosition {
    return { ...this.current };
  }
}
