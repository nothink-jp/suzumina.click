// Admin form validation utilities

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
	if (!email.trim()) {
		return { isValid: false, error: "メールアドレスは必須です" };
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return { isValid: false, error: "有効なメールアドレスを入力してください" };
	}

	return { isValid: true };
};

export const validateRole = (role: string): { isValid: boolean; error?: string } => {
	const validRoles = ["admin", "moderator", "member"];

	if (!role.trim()) {
		return { isValid: false, error: "ロールは必須です" };
	}

	if (!validRoles.includes(role)) {
		return { isValid: false, error: "無効なロールです" };
	}

	return { isValid: true };
};

export const validateStatus = (status: string): { isValid: boolean; error?: string } => {
	const validStatuses = ["new", "in_progress", "resolved"];

	if (!status.trim()) {
		return { isValid: false, error: "ステータスは必須です" };
	}

	if (!validStatuses.includes(status)) {
		return { isValid: false, error: "無効なステータスです" };
	}

	return { isValid: true };
};

export const validatePriority = (priority: string): { isValid: boolean; error?: string } => {
	const validPriorities = ["high", "medium", "low"];

	if (!priority.trim()) {
		return { isValid: false, error: "優先度は必須です" };
	}

	if (!validPriorities.includes(priority)) {
		return { isValid: false, error: "無効な優先度です" };
	}

	return { isValid: true };
};

export const validateRequired = (
	value: string,
	fieldName: string,
): { isValid: boolean; error?: string } => {
	if (!value || !value.trim()) {
		return { isValid: false, error: `${fieldName}は必須です` };
	}

	return { isValid: true };
};

export const validateLength = (
	value: string,
	minLength: number,
	maxLength: number,
	fieldName: string,
): { isValid: boolean; error?: string } => {
	if (value.length < minLength) {
		return { isValid: false, error: `${fieldName}は${minLength}文字以上で入力してください` };
	}

	if (value.length > maxLength) {
		return { isValid: false, error: `${fieldName}は${maxLength}文字以下で入力してください` };
	}

	return { isValid: true };
};

export const validateAdminNotes = (notes: string): { isValid: boolean; error?: string } => {
	const maxLength = 1000;

	if (notes.length > maxLength) {
		return { isValid: false, error: `管理者メモは${maxLength}文字以下で入力してください` };
	}

	return { isValid: true };
};

const validateUserName = (name: string): string | null => {
	const nameValidation = validateRequired(name, "名前");
	if (!nameValidation.isValid) {
		return nameValidation.error ?? "";
	}

	const lengthValidation = validateLength(name, 1, 50, "名前");
	if (!lengthValidation.isValid) {
		return lengthValidation.error ?? "";
	}

	return null;
};

export const validateUserData = (userData: {
	name?: string;
	email?: string;
	role?: string;
	isActive?: boolean;
}): { isValid: boolean; errors: Record<string, string> } => {
	const errors: Record<string, string> = {};

	if (userData.name !== undefined) {
		const nameError = validateUserName(userData.name);
		if (nameError) {
			errors.name = nameError;
		}
	}

	if (userData.email !== undefined) {
		const emailValidation = validateEmail(userData.email);
		if (!emailValidation.isValid) {
			errors.email = emailValidation.error ?? "";
		}
	}

	if (userData.role !== undefined) {
		const roleValidation = validateRole(userData.role);
		if (!roleValidation.isValid) {
			errors.role = roleValidation.error ?? "";
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
};

export const validateContactData = (contactData: {
	status?: string;
	priority?: string;
	adminNotes?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
	const errors: Record<string, string> = {};

	if (contactData.status !== undefined) {
		const statusValidation = validateStatus(contactData.status);
		if (!statusValidation.isValid) {
			errors.status = statusValidation.error ?? "";
		}
	}

	if (contactData.priority !== undefined) {
		const priorityValidation = validatePriority(contactData.priority);
		if (!priorityValidation.isValid) {
			errors.priority = priorityValidation.error ?? "";
		}
	}

	if (contactData.adminNotes !== undefined) {
		const notesValidation = validateAdminNotes(contactData.adminNotes);
		if (!notesValidation.isValid) {
			errors.adminNotes = notesValidation.error ?? "";
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
};
