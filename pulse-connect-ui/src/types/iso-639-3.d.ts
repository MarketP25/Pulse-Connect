declare module "iso-639-3" {
  export type Iso6393Entry = {
    iso6393: string;
    iso6392B?: string;
    iso6392T?: string;
    iso6391?: string;
    name: string;
    type: string;
    scope: string;
  };

  export const iso6393: Iso6393Entry[];
}
