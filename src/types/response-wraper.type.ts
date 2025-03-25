type ResponseWraper<
  Data = Record<string, unknown>,
  Field extends string | undefined = undefined,
> =
  | ({ success: true } & Data)
  | { success: false; message: string; field?: Field };

export default ResponseWraper;
