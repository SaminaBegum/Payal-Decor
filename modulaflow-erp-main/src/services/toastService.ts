import { toast as sonnerToast, type ExternalToast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastConfig extends ExternalToast {
  title: string;
  description?: string;
  duration?: number;
}

/**
 * ToastFactoryClass
 */
class ToastFactory {
  private defaultDuration = 3500;

  /**
   * Display a success feedback toast (Green)
   */
  public success(title: string, description?: string, options?: ExternalToast): string | number {
    return sonnerToast.success(title, {
      description,
      duration: options?.duration || this.defaultDuration,
      ...options,
    });
  }

  /**
   * Display an error feedback toast (Red)
   */
  public error(title: string, description?: string, options?: ExternalToast): string | number {
    return sonnerToast.error(title, {
      description,
      duration: options?.duration || 4500,
      ...options,
    });
  }

  /**
   * Display a warning feedback toast (Amber)
   */
  public warning(title: string, description?: string, options?: ExternalToast): string | number {
    return sonnerToast.warning(title, {
      description,
      duration: options?.duration || this.defaultDuration,
      ...options,
    });
  }

  /**
   * Display an informational feedback toast (Blue)
   */
  public info(title: string, description?: string, options?: ExternalToast): string | number {
    return sonnerToast.info(title, {
      description,
      duration: options?.duration || this.defaultDuration,
      ...options,
    });
  }

  /**
   * Display a loading indicator toast
   */
  public loading(title: string, description?: string, options?: ExternalToast): string | number {
    return sonnerToast.loading(title, {
      description,
      ...options,
    });
  }

  /**
   * Track an async promise with automatic Loading -> Success / Error transitions
   */
  public promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
      description?: string | ((data: T) => string);
    },
    options?: ExternalToast
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      description: messages.description,
      ...options,
    });
  }

  /**
   * Dismiss an active toast by ID, or all toasts if no ID is passed
   */
  public dismiss(toastId?: string | number): void {
    if (toastId !== undefined) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  }

  /**
   * Create custom styled toast
   */
  public custom(message: string, options?: ExternalToast): string | number {
    return sonnerToast(message, options);
  }
}

// Export singleton instance of the factory class for global consumption
export const toastService = new ToastFactory();
export default toastService;
