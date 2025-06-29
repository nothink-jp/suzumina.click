import { toast } from "sonner";

export const showToast = {
	success: (message: string) => {
		toast.success(message);
	},
	error: (message: string) => {
		toast.error(message);
	},
	info: (message: string) => {
		toast.info(message);
	},
	warning: (message: string) => {
		toast.warning(message);
	},
	loading: (message: string) => {
		return toast.loading(message);
	},
	dismiss: (toastId?: string | number) => {
		toast.dismiss(toastId);
	},
	promise: <T>(
		promise: Promise<T>,
		options: {
			loading: string;
			success: string;
			error: string;
		},
	) => {
		toast.promise(promise, options);
	},
};
