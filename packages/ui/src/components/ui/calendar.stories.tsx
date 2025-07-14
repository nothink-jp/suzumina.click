import type { Meta, StoryObj } from "@storybook/react";
import { addDays, format } from "date-fns";
import { ja } from "date-fns/locale";
import { useState } from "react";
import { type DateRange } from "react-day-picker";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

const meta = {
	title: "UI/Calendar",
	component: Calendar,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		mode: {
			control: "select",
			options: ["single", "multiple", "range"],
			description: "選択モード",
		},
		showOutsideDays: {
			control: "boolean",
			description: "月外の日付を表示",
		},
		disabled: {
			control: "boolean",
			description: "無効状態",
		},
		locale: {
			description: "ロケール設定",
		},
	},
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>(new Date());

		return <Calendar mode="single" selected={date} onSelect={setDate} locale={ja} />;
	},
};

export const DatePicker: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>();

		return (
			<div className="space-y-4">
				<Calendar
					mode="single"
					selected={date}
					onSelect={setDate}
					locale={ja}
					className="rounded-md border"
				/>
				<div className="text-sm text-muted-foreground">
					選択された日付: {date ? format(date, "yyyy年MM月dd日", { locale: ja }) : "未選択"}
				</div>
			</div>
		);
	},
};

export const RangePicker: Story = {
	render: () => {
		const [range, setRange] = useState<DateRange | undefined>({
			from: new Date(),
			to: addDays(new Date(), 7),
		});

		return (
			<div className="space-y-4">
				<Calendar
					mode="range"
					selected={range}
					onSelect={setRange}
					locale={ja}
					numberOfMonths={2}
					className="rounded-md border"
				/>
				<div className="text-sm text-muted-foreground">
					選択された期間:{" "}
					{range?.from
						? range.to
							? `${format(range.from, "yyyy年MM月dd日", { locale: ja })} - ${format(range.to, "yyyy年MM月dd日", { locale: ja })}`
							: format(range.from, "yyyy年MM月dd日", { locale: ja })
						: "未選択"}
				</div>
			</div>
		);
	},
};

export const MultipleDates: Story = {
	render: () => {
		const [dates, setDates] = useState<Date[] | undefined>([
			new Date(),
			addDays(new Date(), 2),
			addDays(new Date(), 5),
		]);

		return (
			<div className="space-y-4">
				<Calendar
					mode="multiple"
					selected={dates}
					onSelect={setDates}
					locale={ja}
					className="rounded-md border"
				/>
				<div className="text-sm text-muted-foreground">
					選択された日付:{" "}
					{dates && dates.length > 0
						? dates.map((date) => format(date, "MM/dd", { locale: ja })).join(", ")
						: "未選択"}
				</div>
			</div>
		);
	},
};

export const DisabledDates: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>();

		// 土日を無効にする
		const disableWeekends = (date: Date) => {
			return date.getDay() === 0 || date.getDay() === 6;
		};

		// 過去の日付を無効にする
		const disablePastDates = (date: Date) => {
			return date < new Date();
		};

		return (
			<div className="space-y-4">
				<Calendar
					mode="single"
					selected={date}
					onSelect={setDate}
					locale={ja}
					disabled={[disableWeekends, disablePastDates]}
					className="rounded-md border"
				/>
				<div className="text-sm text-muted-foreground">土日と過去の日付は選択できません</div>
			</div>
		);
	},
};

export const BookingCalendar: Story = {
	render: () => {
		const [selectedDates, setSelectedDates] = useState<Date[]>([]);

		// 予約済みの日付（例）
		const bookedDates = [addDays(new Date(), 3), addDays(new Date(), 7), addDays(new Date(), 10)];

		const isBooked = (date: Date) => {
			return bookedDates.some((bookedDate) => date.toDateString() === bookedDate.toDateString());
		};

		const isPastDate = (date: Date) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return date < today;
		};

		return (
			<Card className="w-fit">
				<CardHeader>
					<CardTitle>予約カレンダー</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Calendar
							mode="multiple"
							selected={selectedDates}
							onSelect={setSelectedDates}
							locale={ja}
							disabled={[isPastDate, isBooked]}
							modifiers={{
								booked: bookedDates,
							}}
							modifiersClassNames={{
								booked: "bg-red-100 text-red-800 line-through",
							}}
							className="rounded-md border"
						/>
						<div className="space-y-2 text-sm">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
								<span>予約済み</span>
							</div>
							<div className="text-muted-foreground">選択済み: {selectedDates.length}日</div>
							{selectedDates.length > 0 && (
								<div className="text-muted-foreground">
									{selectedDates.map((date) => format(date, "MM/dd", { locale: ja })).join(", ")}
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	},
};

export const EventCalendar: Story = {
	render: () => {
		const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

		// イベントデータ（例）
		const events = {
			[format(new Date(), "yyyy-MM-dd")]: ["会議", "プレゼン"],
			[format(addDays(new Date(), 1), "yyyy-MM-dd")]: ["研修"],
			[format(addDays(new Date(), 5), "yyyy-MM-dd")]: ["懇親会", "送別会"],
		};

		const getEventsForDate = (date: Date) => {
			const dateKey = format(date, "yyyy-MM-dd");
			return events[dateKey] || [];
		};

		const hasEvents = (date: Date) => {
			return getEventsForDate(date).length > 0;
		};

		return (
			<Card className="w-fit">
				<CardHeader>
					<CardTitle>イベントカレンダー</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Calendar
							mode="single"
							selected={selectedDate}
							onSelect={setSelectedDate}
							locale={ja}
							modifiers={{
								hasEvents: (date) => hasEvents(date),
							}}
							modifiersClassNames={{
								hasEvents: "bg-blue-100 text-blue-800 font-medium",
							}}
							className="rounded-md border"
						/>
						{selectedDate && (
							<div className="space-y-2">
								<h4 className="font-medium">
									{format(selectedDate, "yyyy年MM月dd日", { locale: ja })}
								</h4>
								<div className="space-y-1">
									{getEventsForDate(selectedDate).length > 0 ? (
										getEventsForDate(selectedDate).map((event, index) => (
											<div
												key={index}
												className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-500"
											>
												{event}
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">イベントはありません</p>
									)}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	},
};

export const CustomStyling: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>(new Date());

		return (
			<Calendar
				mode="single"
				selected={date}
				onSelect={setDate}
				locale={ja}
				className="rounded-md border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50"
				classNames={{
					day: "hover:bg-purple-100",
					today: "bg-purple-200 text-purple-900",
				}}
			/>
		);
	},
};

export const WithActions: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>();

		const handleToday = () => {
			setDate(new Date());
		};

		const handleClear = () => {
			setDate(undefined);
		};

		return (
			<div className="space-y-4">
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleToday}>
						今日
					</Button>
					<Button variant="outline" size="sm" onClick={handleClear}>
						クリア
					</Button>
				</div>
				<Calendar
					mode="single"
					selected={date}
					onSelect={setDate}
					locale={ja}
					className="rounded-md border"
				/>
			</div>
		);
	},
};

export const Minimal: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>(new Date());

		return (
			<Calendar
				mode="single"
				selected={date}
				onSelect={setDate}
				locale={ja}
				showOutsideDays={false}
				className="w-fit"
			/>
		);
	},
};
