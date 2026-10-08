export type PinSetupProps = { onSubmit: (pin: string) => Promise<string | null> };
export type ProfileSetupProps = { onSubmit: (name: string, avatar: string) => void };
