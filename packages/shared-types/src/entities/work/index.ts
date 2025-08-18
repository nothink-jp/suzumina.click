/**
 * Work Module Index
 *
 * Central export point for all work-related types, schemas, and utilities.
 * This module provides a cleaner, more organized structure following KISS principle.
 */

// Re-export Work entity and related types from work-entity
export type {
	WorkExtendedInfo,
	WorkMetadata,
	WorkSalesStatus,
	WorkSeriesInfo,
} from "../work-entity";
export { Work } from "../work-entity";
// Export language detection utilities
export * from "./language-detection";
// Export builder and factory
export * from "./work-builder";
// Export constants
export * from "./work-constants";
// Export document schemas and types
export * from "./work-document-schema";
export * from "./work-factory";
// Export all schemas
export * from "./work-schemas";
// Export all types
export * from "./work-types";
// Export utility functions
export * from "./work-utils";
