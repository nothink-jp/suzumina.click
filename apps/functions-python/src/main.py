import functions_framework
import json
from src.api.youtube import get_channel_info, get_latest_videos, get_video_details, search_videos
from src.api.hello import hello
from src.utils.error_handler import handle_error

@functions_framework.http
def main(request):
    """Cloud Function entry point that routes to the appropriate API function."""
    try:
        path = request.path.strip('/').lower()
        
        # API ルーティング
        if path == 'api/hello' or path == 'hello':
            return hello(request)
            
        elif path == 'api/youtube/channel':
            return get_channel_info(request)
            
        elif path == 'api/youtube/videos':
            return get_latest_videos(request)
            
        elif path.startswith('api/youtube/video/'):
            video_id = path.split('/')[-1]
            return get_video_details(request, video_id)
            
        elif path == 'api/youtube/search':
            return search_videos(request)
            
        else:
            return json.dumps({
                'error': 'Not Found',
                'message': f'No API endpoint found for path: {path}'
            }), 404, {'Content-Type': 'application/json'}
            
    except Exception as e:
        return handle_error(e)