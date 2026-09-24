type InitialFormData<T> = T extends object ? Partial<T> : undefined;

export type FormState<T> =
  | {
      status: "initial";
      data?: InitialFormData<T>;
    }
  | {
      status: "success";
      data: T;
    }
  | {
      status: "error";
      data: T;
      errors: {
        formErrors: string[];
        fieldErrors?: Partial<Record<keyof T, string[]>>;
      };
    };
