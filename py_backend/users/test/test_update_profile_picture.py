from django.test import TestCase
from users.models import CustomUser
from django.urls import reverse
from django.test import Client


class UpdateProfilePictureTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = CustomUser.objects.create_user(username='testuser', password='testpass', bio='Hello !')
        self.client.login(username='testuser', password='testpass')


    def test_update_profile_picture(self):
        with open('media/hunter.jpg', 'rb') as img:
            response = self.client.post(
                reverse('update_profile_picture'),
                {'image': img})
                
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.avatar)


    def test_picture_too_big(self):
        with open('media/river.jpg', 'rb') as img:
            response = self.client.post(
                reverse('update_profile_picture'),
                {'image': img})
                
        self.assertEqual(response.status_code, 400)
        response_data = response.json()

        self.assertEqual(response_data.get('error'), 'File size exceeds the limit.')


    def test_invalid_picture(self):
        with open('media/invalid.cub', 'rb') as img:
            response = self.client.post(
                reverse('update_profile_picture'),
                {'image': img})
                
        self.assertEqual(response.status_code, 400)
        response_data = response.json()

        self.assertEqual(response_data.get('error'), 'Invalid image type.')