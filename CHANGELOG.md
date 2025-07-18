# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2025-07-19

### Added
- **Authentication-based UX Improvements**: Non-authenticated users can no longer interact with favorite, like, and dislike buttons
- **Visual Feedback**: Disabled buttons now display with reduced opacity (50%) and appropriate cursor changes
- **Accessibility**: Added tooltips explaining login requirements for disabled buttons
- **Comprehensive Testing**: New test cases for authentication scenarios and button states

### Changed
- **Button Behavior**: Favorite, like, and dislike buttons are now disabled when user is not authenticated
- **User Experience**: Improved clarity for users about login requirements
- **Storybook**: Updated stories to demonstrate authentication states

### Fixed
- **UX Issue**: Non-authenticated users no longer see confusing "login required" toasts after clicking buttons
- **Accessibility**: Proper disabled states and ARIA labels for better screen reader support

## [0.3.3] - 2025-07-15

### Added
- **Audio Button Performance Optimization**: YouTube Player pooling system with LRU management
- **Memory Optimization**: 87% memory reduction (200-400MB → 25-50MB)
- **API Optimization**: 98% API call reduction (100-150 → 1 call)
- **Display Capacity**: 96 audio buttons display capacity (92% improvement)
- **Virtualization**: react-window integration for large datasets
- **Progressive Loading**: Skeleton → preview → full loading system

### Changed
- **Performance**: Significantly improved audio button rendering performance
- **Memory Usage**: Optimized memory management for large audio button lists

## [0.3.2] - 2025-07-13

### Added
- **Google AdSense Integration**: CSP compliance for ad serving
- **Cookie Consent System**: GDPR compliance implementation
- **Security Policies**: Updated policies for ad serving

### Changed
- **Security**: Enhanced Content Security Policy for ad integration

## [0.3.1] - 2025-07-09

### Added
- **DLsite Data Collection**: Optimized system for work information retrieval

### Removed
- **Sales Count Feature**: Complete removal of salesCount functionality

### Changed
- **Data Collection**: Improved efficiency of DLsite integration

## [0.3.0] - 2025-07-01

### Added
- **Initial Production Release**: Full-featured fan site for 涼花みなせ
- **Audio Button System**: YouTube timestamp-based audio sharing
- **DLsite Integration**: Work information and high-resolution images
- **User Authentication**: Discord OAuth integration
- **Search System**: Cross-content search with advanced filtering
- **Admin Interface**: Complete content and user management
- **Responsive Design**: Mobile-optimized interface
- **Performance Monitoring**: Comprehensive testing suite (960+ tests)

### Technical
- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS v4
- **Backend**: Cloud Functions + Firestore
- **Infrastructure**: Terraform + Google Cloud Platform
- **Testing**: Vitest + Playwright E2E
- **Code Quality**: Biome (Linter/Formatter)

---

**Note**: This changelog follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format for better readability and standardization.