from django import forms
from .models import Video


class VideoForm(forms.ModelForm):
    class Meta:
        model = Video
        fields = ['title', 'description', 'quality', 'publish_date',
                  'video_file', 'thumbnail']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control', 'placeholder': 'Video Title'}),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Description (Optional)', 'rows': 6}),
            'quality': forms.Select(attrs={'class': 'form-select'}),
            'publish_date': forms.DateInput(
                attrs={'class': 'form-control', 'type': 'date'}),
            'video_file': forms.ClearableFileInput(attrs={
                'class': 'form-control',
                'accept': 'video/mp4,video/webm,video/ogg'}),
            'thumbnail': forms.ClearableFileInput(attrs={
                'class': 'form-control', 'accept': 'image/*'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['quality'].empty_label = 'Video Quality'
