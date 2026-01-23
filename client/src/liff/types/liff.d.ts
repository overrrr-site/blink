declare module '@line/liff' {
  export interface Profile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }

  export interface Liff {
    init(config: { liffId: string }): Promise<void>;
    isLoggedIn(): boolean;
    login(): void;
    logout(): void;
    getProfile(): Promise<Profile>;
    isInClient(): boolean;
    openWindow(params: { url: string; external?: boolean }): void;
    closeWindow(): void;
    sendMessages(messages: any[]): Promise<void>;
  }

  const liff: Liff;
  export default liff;
}
