from django.test import TestCase
from django.urls import reverse
from users.models import CustomUser
from django.test import Client
import json


class FriendsInteractions(TestCase):
	def setUp(self):
		self.user1 = CustomUser.objects.create_user(
            username="lboulatr",
            email="lboulatr@gmail.com",
            password="ClassicPassword9+")
		self.user2 = CustomUser.objects.create_user(
            username="osterga",
            email="osterga@gmail.com",
            password="ClassicPassword9+")
		self.user3 = CustomUser.objects.create_user(
			username="oxford-mate",
			email="oxford@gmail.com",
			password="ClassicPassword9+")
		
		self.user1.email_is_verified = True
		self.user1.save()
		self.user2.email_is_verified = True
		self.user2.save()
		self.user3.email_is_verified = True
		self.user3.save()
		
		user1 = {
			'username': 'lboulatr',
			'password': 'ClassicPassword9+'
		}

		self.client.post(
		    reverse('login'), 
		    data=json.dumps(user1), 
		    content_type='application/json')
		
		response_request = self.client.post(
			reverse('send_request',
			args=[self.user2.id]),
			follow=True)
		friend_request_id = response_request.json()['id']

		self.client.post(
			reverse('accept_friend',
			args=[friend_request_id]),
			follow=True)


	def test_check_if_login(self):
		self.assertTrue('_auth_user_id' in self.client.session)
		self.assertEqual(int(self.client.session['_auth_user_id']), self.user1.id)


	def test_check_if_user1_and_user2_are_friends(self):
		self.assertEqual(self.user1.friends.count(), 1)
		self.assertEqual(self.user2.friends.count(), 1)

		user_friendslist = self.user1.friends.all()
		self.assertIn(self.user2, user_friendslist)


	def test_send_request_success(self):
		response_request = self.client.post(
			reverse('send_request',
			args=[self.user3.id]),
			follow=True)
		self.assertEqual(response_request.status_code, 200)


	def test_send_request_bad_id(self):
		id = 0

		response_request = self.client.post(
			reverse('send_request',
			args=[id]),
			follow=True)
		
		self.assertEqual(response_request.status_code, 404)
		

	def test_friend_request_success(self):
		self.assertEqual(self.user1.friends.count(), 1)
		self.assertEqual(self.user3.friends.count(), 0)

		response_request = self.client.post(
			reverse('send_request',
			args=[self.user3.id]),
			follow=True)
		
		friend_request_id = response_request.json()['id']
		self.assertEqual(response_request.status_code, 200)

		response_accept = self.client.post(
		    reverse('accept_friend',
			args=[friend_request_id]),
			follow=True)

		self.assertEqual(response_accept.status_code, 200)
		self.assertEqual(self.user1.friends.count(), 2)
		self.assertEqual(self.user3.friends.count(), 1)


	def test_users_already_friends(self):

		response_request = self.client.post(
			reverse('send_request',
			args=[self.user2.id]),
			follow=True)
		
		friend_request_id = response_request.json()['id']
		self.assertEqual(response_request.status_code, 200)

		response_accept = self.client.post(
		    reverse('accept_friend',
			args=[friend_request_id]),
			follow=True)

		self.assertEqual(response_accept.status_code, 400)
		response_data = response_accept.json()
		self.assertEqual(response_data.get('status'), 'Users are already friends')


	def test_remove_friend(self):
		self.assertEqual(self.user1.friends.count(), 1)
		self.assertEqual(self.user2.friends.count(), 1)

		response_request = self.client.post(
			reverse('send_request',
			args=[self.user2.id]),
			follow=True)
		
		remove_request_id = response_request.json()['id']
		self.assertEqual(response_request.status_code, 200)

		response_remove = self.client.post(
		    reverse('remove_friend',
			args=[remove_request_id]),
			follow=True)

		self.assertEqual(response_remove.status_code, 200)
		self.assertEqual(self.user1.friends.count(), 0)
		self.assertEqual(self.user2.friends.count(), 0)


	def test_remove_friend_but_users_not_friends(self):
		self.assertEqual(self.user1.friends.count(), 1)
		self.assertEqual(self.user3.friends.count(), 0)

		response_request = self.client.post(
			reverse('send_request',
			args=[self.user3.id]),
			follow=True)
		
		remove_request_id = response_request.json()['id']
		self.assertEqual(response_request.status_code, 200)

		response_remove = self.client.post(
		    reverse('remove_friend',
			args=[remove_request_id]),
			follow=True)

		self.assertEqual(response_remove.status_code, 400)
		response_data = response_remove.json()
		self.assertEqual(response_data.get('status'), 'Users are not friends')
		self.assertEqual(self.user1.friends.count(), 1)
		self.assertEqual(self.user3.friends.count(), 0)
	

	def test_get_friendslist(self):
		response = self.client.post(
		    reverse('get_friendslist'),
		    content_type='application/json')
		data = response.json()
		self.assertEqual(response.status_code, 200)
		self.assertIn('friends', data)
		self.assertIsInstance(data['friends'], list)


	def test_get_friendslist_with_no_friends(self):
		self.assertEqual(self.user1.friends.count(), 1)
		self.user1.friends.clear()		
		self.assertEqual(self.user1.friends.count(), 0)

		response = self.client.post(
		    reverse('get_friendslist'),
		    content_type='application/json')
		data = response.json()
		self.assertEqual(response.status_code, 200)
		self.assertEqual(data.get('status'), 'User have 0 friends')


class MultipleCases(TestCase):

	def setUp(self):
		self.client1 = Client()
		self.client2 = Client()

		self.user1 = CustomUser.objects.create_user(
			username='user1',
			email='user1@gmail.com',
			password='User1Password+')
		self.user2 = CustomUser.objects.create_user(
			username='user2',
			email='user2@gmail.com',
			password='User2Password+')
		self.client1.login(username='user1', password='User1Password+')
		self.client2.login(username='user2', password='User2Password+')
		# self.friends = [CustomUser.objects.create_user(username=f'friend{i}', password='friendpassword') for i in range(5)]


	def test_multiple_cases(self):
		self.assertEqual(int(self.client1.session['_auth_user_id']), self.user1.id)
		self.assertEqual(int(self.client2.session['_auth_user_id']), self.user2.id)
		self.assertEqual(self.user1.friends.count(), 0)
		self.assertEqual(self.user2.friends.count(), 0)

		friend_request = self.client1.post(
			reverse('send_request',
			args=[self.user2.id]),
			content_type='application/json',
			follow=True)
		self.assertEqual(friend_request.status_code, 200)
		
		friend_request_id = friend_request.json()['id']
		response_accept = self.client1.post(
		    reverse('accept_friend',
			args=[friend_request_id]),
			content_type='application/json',
			follow=True)
		
		self.assertEqual(response_accept.status_code, 200)
		self.assertEqual(self.user1.friends.count(), 1)
		self.assertEqual(self.user2.friends.count(), 1)

		remove_request = self.client1.post(
			reverse('send_request',
			args=[self.user2.id]),
			content_type='application/json',
			follow=True)
		self.assertEqual(remove_request.status_code, 200)
		remove_request_id = remove_request.json()['id']

		response_remove = self.client1.post(
		    reverse('remove_friend',
			args=[remove_request_id]),
			content_type='application/json',
			follow=True)
		
		self.assertEqual(response_remove.status_code, 200)
		self.assertEqual(self.user1.friends.count(), 0)
		self.assertEqual(self.user2.friends.count(), 0)
	
	# def test_add_multiple_friends(self):
    #     # Create a Friend instance for the user
	# 	user_friend = Friend.objects.create(user=self.user)
    #     # Add multiple friends to the user
	# 	for friend in self.friends:
	# 		user_friend.friends.add(friend)
        
    #     # Verify that the friends were added correctly
	# 	self.assertEqual(user_friend.friends.count(), len(self.friends))
	# 	for friend in self.friends:
	# 		self.assertTrue(user_friend.friends.filter(id=friend.id).exists())