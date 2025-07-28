# YouTube Data API v3 Integration

This document describes the YouTube Data API v3 integration in suzumina.click.

## Overview

The YouTube Data API v3 is used to fetch video metadata for the audio button system. Each audio button references a specific timestamp in a YouTube video.

## API Usage

### Endpoints Used

1. **Videos.list**
   - Purpose: Fetch video details (title, channel, duration, thumbnail)
   - Parts: `snippet`, `contentDetails`, `statistics`
   - Quota cost: 1 unit per request

### Implementation Details

**Location**: `apps/functions/src/infrastructure/youtube/youtube-client.ts`

```typescript
// Main method for fetching video data
async getVideo(videoId: string): Promise<Video | null>
```

### Rate Limits and Quotas

- **Daily Quota**: 10,000 units per day
- **Cost per request**: 1 unit for videos.list
- **Strategy**: Cache video data in Firestore to minimize API calls

### Error Handling

Common errors and handling:
- `quotaExceeded`: Wait until quota reset (Pacific time midnight)
- `videoNotFound`: Return null, mark video as unavailable
- `forbidden`: Check API key validity

### Data Caching

Video data is cached in Firestore:
- Collection: `videos`
- Cache duration: Indefinite (videos rarely change)
- Update trigger: Manual refresh or user report

## Known Issues

1. **Player API postMessage warnings**
   - These are internal Google warnings and can be safely ignored
   - No impact on functionality

2. **Embedded player restrictions**
   - Some videos may have embedding disabled
   - Handle gracefully with error message

## Best Practices

1. **Always check video availability** before creating audio buttons
2. **Cache aggressively** - video metadata rarely changes
3. **Handle errors gracefully** - show user-friendly messages
4. **Monitor quota usage** in Google Cloud Console

## Environment Variables

```bash
YOUTUBE_API_KEY=your-api-key-here
```

## Testing

Test with various video types:
- Regular videos
- Age-restricted videos
- Private/deleted videos
- Live streams

---

**Last Updated**: 2025-07-28