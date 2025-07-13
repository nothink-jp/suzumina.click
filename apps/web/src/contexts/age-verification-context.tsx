"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface AgeVerificationContextType {
	/** 年齢確認済みかどうか */
	isAgeVerified: boolean;
	/** 18歳以上として確認済みかどうか */
	isAdult: boolean;
	/** R18コンテンツの表示を許可するかどうか */
	showR18Content: boolean;
	/** 年齢確認状態の更新 */
	updateAgeVerification: (isAdult: boolean) => void;
	/** ローディング状態 */
	isLoading: boolean;
}

const AgeVerificationContext = createContext<AgeVerificationContextType | null>(null);

interface AgeVerificationProviderProps {
	children: React.ReactNode;
}

export function AgeVerificationProvider({ children }: AgeVerificationProviderProps) {
	const [isAgeVerified, setIsAgeVerified] = useState(false);
	const [isAdult, setIsAdult] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// ローカルストレージから年齢確認状態を読み込み
		const verified = localStorage.getItem("age-verified");
		const verificationDate = localStorage.getItem("age-verification-date");
		const isAdultStored = localStorage.getItem("age-verification-adult") === "true";

		if (verified === "true" && verificationDate) {
			const verifiedDate = new Date(verificationDate);
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			// 30日以内の確認の場合
			if (verifiedDate > thirtyDaysAgo) {
				setIsAgeVerified(true);
				setIsAdult(isAdultStored);
			} else {
				// 期限切れの場合はクリア
				localStorage.removeItem("age-verified");
				localStorage.removeItem("age-verification-date");
				localStorage.removeItem("age-verification-adult");
			}
		}

		setIsLoading(false);
	}, []);

	const updateAgeVerification = (adult: boolean) => {
		setIsAgeVerified(true);
		setIsAdult(adult);

		// ローカルストレージに保存
		localStorage.setItem("age-verified", "true");
		localStorage.setItem("age-verification-date", new Date().toISOString());
		localStorage.setItem("age-verification-adult", adult.toString());
	};

	const showR18Content = isAgeVerified && isAdult;

	return (
		<AgeVerificationContext.Provider
			value={{
				isAgeVerified,
				isAdult,
				showR18Content,
				updateAgeVerification,
				isLoading,
			}}
		>
			{children}
		</AgeVerificationContext.Provider>
	);
}

export function useAgeVerification() {
	const context = useContext(AgeVerificationContext);
	if (!context) {
		throw new Error("useAgeVerification must be used within an AgeVerificationProvider");
	}
	return context;
}
