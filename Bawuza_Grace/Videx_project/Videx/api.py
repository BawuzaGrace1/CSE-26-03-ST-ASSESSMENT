from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Video
from .serializers import VideoSerializer
from .views import filter_videos


class VideoViewSet(viewsets.ModelViewSet):
    serializer_class = VideoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return filter_videos(self.request.query_params)

    def perform_destroy(self, instance):
        instance.video_file.delete(save=False)
        instance.thumbnail.delete(save=False)
        instance.delete()

    @action(detail=True, methods=['post'])
    def watch(self, request, pk=None):
        video = self.get_object()
        Video.objects.filter(pk=video.pk).update(views=F('views') + 1)
        video.refresh_from_db()
        return Response(self.get_serializer(video).data)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        video = self.get_object()
        if request.data.get('action') == 'unlike':
            Video.objects.filter(pk=video.pk, likes__gt=0).update(likes=F('likes') - 1)
        else:
            Video.objects.filter(pk=video.pk).update(likes=F('likes') + 1)
        video.refresh_from_db()
        return Response(self.get_serializer(video).data)
