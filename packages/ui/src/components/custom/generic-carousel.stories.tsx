import type { Meta, StoryObj } from "@storybook/react";
import { GenericCarousel } from "./generic-carousel";

// Sample data for demonstrations
interface SampleItem {
	id: string;
	title: string;
	description: string;
	color: string;
}

const sampleItems: SampleItem[] = [
	{ id: "1", title: "Item 1", description: "First sample item", color: "bg-blue-100" },
	{ id: "2", title: "Item 2", description: "Second sample item", color: "bg-green-100" },
	{ id: "3", title: "Item 3", description: "Third sample item", color: "bg-yellow-100" },
	{ id: "4", title: "Item 4", description: "Fourth sample item", color: "bg-red-100" },
	{ id: "5", title: "Item 5", description: "Fifth sample item", color: "bg-purple-100" },
	{ id: "6", title: "Item 6", description: "Sixth sample item", color: "bg-pink-100" },
];

const meta: Meta<typeof GenericCarousel> = {
	title: "Custom/GenericCarousel",
	component: GenericCarousel,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component: `
A highly reusable, type-safe carousel component that can display any type of data. 
Built on top of the shadcn/ui Carousel component with support for TypeScript generics.

## Features
- **Type-safe**: Uses TypeScript generics to work with any data type
- **Customizable rendering**: Accept a render function for complete control over item display
- **Empty state handling**: Shows a message when no items are provided
- **Responsive breakpoints**: Adapts item count based on screen size
- **Navigation controls**: Built-in previous/next buttons
- **Accessible**: Inherits accessibility features from shadcn/ui Carousel

## Usage
This component is perfect for creating specialized carousels like FeaturedVideosCarousel, 
FeaturedWorksCarousel, etc. by providing item-specific render functions.
				`,
			},
		},
	},
	argTypes: {
		items: {
			description: "Array of items to display in the carousel",
			control: false,
		},
		renderItem: {
			description: "Function that renders each item",
			control: false,
		},
		emptyStateMessage: {
			description: "Message to show when no items are available",
			control: "text",
		},
		getItemKey: {
			description: "Function to extract unique key from each item",
			control: false,
		},
		itemClassName: {
			description: "Additional CSS classes for carousel items",
			control: "text",
		},
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GenericCarousel>;

// Default story with sample cards
export const Default: Story = {
	args: {
		items: sampleItems,
		renderItem: (item) => (
			<div className={`p-4 rounded-lg border ${item.color} h-32`}>
				<h3 className="font-semibold text-lg">{item.title}</h3>
				<p className="text-sm text-muted-foreground mt-2">{item.description}</p>
			</div>
		),
		emptyStateMessage: "No items to display",
		getItemKey: (item) => item.id,
	},
	render: (args) => (
		<div className="w-full max-w-4xl">
			<GenericCarousel {...args} />
		</div>
	),
};

// Empty state story
export const EmptyState: Story = {
	args: {
		items: [],
		renderItem: (item: SampleItem) => (
			<div className="p-4 rounded-lg border bg-gray-100 h-32">
				<h3 className="font-semibold text-lg">{item.title}</h3>
				<p className="text-sm text-muted-foreground mt-2">{item.description}</p>
			</div>
		),
		emptyStateMessage: "No featured items available right now",
		getItemKey: (item) => item.id,
	},
	render: (args) => (
		<div className="w-full max-w-4xl">
			<GenericCarousel {...args} />
		</div>
	),
};

// Single item story
export const SingleItem: Story = {
	args: {
		items: [sampleItems[0]],
		renderItem: (item) => (
			<div className={`p-4 rounded-lg border ${item.color} h-32`}>
				<h3 className="font-semibold text-lg">{item.title}</h3>
				<p className="text-sm text-muted-foreground mt-2">{item.description}</p>
			</div>
		),
		emptyStateMessage: "No items to display",
		getItemKey: (item) => item.id,
	},
	render: (args) => (
		<div className="w-full max-w-4xl">
			<GenericCarousel {...args} />
		</div>
	),
};

// Many items story to show scrolling behavior
export const ManyItems: Story = {
	args: {
		items: Array.from({ length: 12 }, (_, i) => ({
			id: `item-${i + 1}`,
			title: `Item ${i + 1}`,
			description: `Description for item number ${i + 1}`,
			color: `bg-${["blue", "green", "yellow", "red", "purple", "pink", "indigo", "orange"][i % 8]}-100`,
		})),
		renderItem: (item) => (
			<div className={`p-4 rounded-lg border ${item.color} h-32`}>
				<h3 className="font-semibold text-lg">{item.title}</h3>
				<p className="text-sm text-muted-foreground mt-2">{item.description}</p>
			</div>
		),
		emptyStateMessage: "No items to display",
		getItemKey: (item) => item.id,
	},
	render: (args) => (
		<div className="w-full max-w-4xl">
			<GenericCarousel {...args} />
		</div>
	),
};

// Custom item styling story
export const CustomStyling: Story = {
	args: {
		items: sampleItems.slice(0, 4),
		renderItem: (item) => (
			<div className="p-6 rounded-xl border-2 border-dashed border-primary/20 bg-card hover:bg-accent transition-colors h-40">
				<div className="flex items-center justify-center h-full">
					<div className="text-center">
						<h3 className="font-bold text-xl text-primary">{item.title}</h3>
						<p className="text-muted-foreground mt-2">{item.description}</p>
					</div>
				</div>
			</div>
		),
		emptyStateMessage: "Custom empty state message",
		getItemKey: (item) => item.id,
		itemClassName: "p-1", // Add custom padding
	},
	render: (args) => (
		<div className="w-full max-w-4xl">
			<GenericCarousel {...args} />
		</div>
	),
};
