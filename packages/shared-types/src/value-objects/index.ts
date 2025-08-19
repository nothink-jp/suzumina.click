/**
 * Value Objects module
 *
 * This module provides base classes and utilities for implementing
 * Value Objects in the domain model.
 */

// AudioButton-related Value Objects removed - using PlainObject pattern
// Export base Value Object utilities
export * from "./base";
// Export Video-related Value Objects
export * from "./video/channel";
export * from "./video/video-content";
export * from "./video/video-metadata";
export * from "./video/video-statistics";
export * from "./video-category";
// Export Work-related Value Objects
export * from "./work/circle";
export * from "./work/creator-type";
export * from "./work/date-range";
export * from "./work/price";
export * from "./work/rating";
export * from "./work/work-creators";
export * from "./work/work-id";
export * from "./work/work-price";
export * from "./work/work-rating";
export * from "./work/work-title";
