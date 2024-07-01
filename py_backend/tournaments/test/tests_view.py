from django.test import TestCase
from django.urls import reverse
from django.test import Client

from unittest.mock import patch
from unittest.mock import Mock

from users.models import CustomUser
from tournaments.models import Tournament, TournamentMatch

import json

from django.core.exceptions import ObjectDoesNotExist


class TournamentModeTest(TestCase):
# set-up
	def setUp(self):
		self.client = Client()
		self.user_host = CustomUser.objects.create_user(username='testuser1',
										 email='testuser1@gmail.com',
										 password='Password1+')
		self.user2 = CustomUser.objects.create_user(username='testuser2',
										 email='testuser2@gmail.com',
										 password='Password2+')
		self.user3 = CustomUser.objects.create_user(username='testuser3',
										 email='testuser3@gmail.com',
										 password='Password3+')
		self.user4 = CustomUser.objects.create_user(username='testuser4',
										 email='testuser4@gmail.com',
										 password='Password4+')
		self.user5 = CustomUser.objects.create_user(username='testuser5',
										 email='testuser5@gmail.com',
										 password='Password5+')
		
		self.user_host.is_online = True
		self.user_host.email_is_verified = True
		self.user_host.save()

		self.user2.is_online = True
		self.user2.email_is_verified = True
		self.user2.save()

		self.user3.is_online = True
		self.user3.email_is_verified = True
		self.user3.save()

		self.user4.is_online = True
		self.user4.email_is_verified = True
		self.user4.save()

		self.user5.is_online = True
		self.user5.email_is_verified = True
		self.user5.save()

	def create_test_tournament(self, name, max_players):
		data = {
			'name': name,
			'max_players': max_players
		}
		response = self.client.post(
			reverse('create_tournament'),
			data=json.dumps(data),
			content_type='application/json')
		return response

	def find_tournament_id(self, tournament):
		tournament_data = {}
		if tournament.status_code == 201:
			tournament_data = json.loads(tournament.content)
		else:
			print(tournament.content)
		return tournament_data.get('tournament').get('id')

### tests create a tournament ###

	def test_create_right_tournament(self):
		name = "test1"
		max_players = 5
		
		self.client.login(username='testuser1', password='Password1+')
		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 201)
		
		try:
			tournament = Tournament.objects.get(name=name)
			self.assertEqual(tournament.name, name)
			self.assertEqual(tournament.max_players, max_players)
		except Tournament.DoesNotExist:
			self.fail("Tournament was not created")

	def test_player_max(self):
		name = "test3"
		max_players = 33
		
		self.client.login(username='testuser1', password='Password1+')
		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 400)

	def test_player_min(self):
		name = "test4"
		max_players = 1
		
		self.client.login(username='testuser1', password='Password1+')
		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 400)

	def test_no_name(self):
		name = ""
		max_players = 8
		
		self.client.login(username='testuser1', password='Password1+')
		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 400)

	def test_invalid_data_format(self):
		name = "Hithere"
		max_players = "Salut"
		
		self.client.login(username='testuser1', password='Password1+')
		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 400)

	def test_no_login(self):
		name = "Hithere"
		max_players = 8
		
		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 302)

# create tournament with same name
	def test_create_duplicate_name(self):
		name = "Hithere"
		max_players = 5
		
		self.client.login(username='testuser1', password='Password1+')
		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 201)
		try:
			tournament = Tournament.objects.get(name=name)
		except Tournament.DoesNotExist:
			self.fail("Tournament was not created")
		response = self.create_test_tournament("othername", max_players)
		self.assertEqual(response.status_code, 201)

		response = self.create_test_tournament(name, max_players)
		self.assertEqual(response.status_code, 400)

# join public with other account working fine
	def test_join_with_other(self):
		self.client.login(username='testuser1', password='Password1+')

		name = "Hithere"
		max_players = 8
		
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)

		self.client.login(username='testuser2', password='Password2+')

		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

# join multiple player
	def test_multiplie_join_working(self):

		name = "Hithere"
		max_players = 3

		self.client.login(username='testuser1', password='Password1+')
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.get(reverse("check_if_tournament_joined", args=['testuser1']))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(response.content).get('joined'), True)

		self.client.logout()
		self.client.login(username='testuser2', password='Password2+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		self.client.logout()
		self.client.login(username='testuser3', password='Password3+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)


# join a tournament already full
	def test_already_full_tournament(self):

		name = "Hithere"
		max_players = 4

		self.client.login(username='testuser1', password='Password1+')
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.get(reverse("check_if_tournament_joined", args=['testuser1']))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(response.content).get('joined'), True)

		self.client.logout()
		self.client.login(username='testuser2', password='Password2+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		self.client.logout()
		self.client.login(username='testuser3', password='Password3+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		self.client.login(username='testuser4', password='Password4+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		self.client.login(username='testuser5', password='Password5+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 400)

# join a tournament already joined
	def test_already_joined(self):

		name = "Hithere"
		max_players = 4

		self.client.login(username='testuser1', password='Password1+')
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.get(reverse("check_if_tournament_joined", args=['testuser1']))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(response.content).get('joined'), True)

		self.client.logout()
		self.client.login(username='testuser2', password='Password2+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		self.client.logout()
		self.client.login(username='testuser1', password='Password1+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 400)

# join without authentification
	def test_join_not_login(self):

		name = "Hithere"
		max_players = 4

		self.client.login(username='testuser1', password='Password1+')
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		self.client.logout()
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 302)

# join non existant tournament
	def test_join_non_existant_tournament(self):
		self.client.login(username='testuser1', password='Password1+')
		
		id = 999
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 404)

### tests quit tournament ###
		
	# quit after joining
	def test_quit_after_joining(self):
		self.client.login(username='testuser1', password='Password1+')

		name = "Hithere"
		max_players = 8
		
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.get(reverse("check_if_tournament_joined", args=['testuser1']))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(response.content).get('joined'), True)

		response = self.client.post(reverse("quit_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)
		with self.assertRaises(ObjectDoesNotExist):
			Tournament.objects.get(pk=id)

# user not in the tournament
	def test_quit_was_not_in_it(self):
		self.client.login(username='testuser1', password='Password1+')

		name = "Hithere"
		max_players = 8
		
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		self.client.logout()

		self.client.login(username='testuser2', password='Password2+')
		response = self.client.post(reverse("quit_tournament", args=[id]))
		self.assertEqual(response.status_code, 400)

# tournament does not exist
	def test_quit_tournament_does_not_exist(self):
		self.client.login(username='testuser1', password='Password1+')

		name = "Hithere"
		max_players = 8

		id = 999

		response = self.client.post(reverse("quit_tournament", args=[id]))
		self.assertEqual(response.status_code, 404)

# user quit multiple times
	def test_quit_and_join_multiple_time(self):
		self.client.login(username='testuser1', password='Password1+')

		name = "Hithere"
		max_players = 8
		
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.get(reverse("check_if_tournament_joined", args=['testuser1']))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(response.content).get('joined'), True)

		self.client.logout()
		self.client.login(username='testuser2', password='Password2+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		response = self.client.post(reverse("quit_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		response = self.client.post(reverse("quit_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		tournament = Tournament.objects.get(pk=id)
		self.assertFalse(tournament.participants.filter(username='testuser2').exists())

# non logged user quit
	def test_quit_non_logged_quit(self):
		self.client.login(username='testuser1', password='Password1+')

		name = "Hithere"
		max_players = 8
		
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.get(reverse("check_if_tournament_joined", args=['testuser1']))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(response.content).get('joined'), True)

		self.client.logout()

		response = self.client.post(reverse("quit_tournament", args=[id]))
		self.assertEqual(response.status_code, 302)

# a user try to join a full tournament, another quit, he try to join again 
	def test_quit_after_tournament_full_then_join(self):

		name = "Hithere"
		max_players = 2
		
		self.client.login(username='testuser1', password='Password1+')
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.get(reverse("check_if_tournament_joined", args=['testuser1']))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(response.content).get('joined'), True)


		self.client.login(username='testuser2', password='Password2+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		self.client.login(username='testuser3', password='Password3+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 400)

		self.client.login(username='testuser2', password='Password2+')
		response = self.client.post(reverse("quit_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

		self.client.login(username='testuser3', password='Password3+')
		response = self.client.post(reverse("join_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)

### tests delete tournament ###

# delete tournament successfully
	def test_delete_successfully(self):
		name = "Hithere"
		max_players = 2

		self.client.login(username='testuser1', password='Password1+')
		tournament = self.create_test_tournament(name, max_players)
		id = self.find_tournament_id(tournament)
		response = self.client.delete(reverse("delete_tournament", args=[id]))
		self.assertEqual(response.status_code, 200)
		response = self.client.post(reverse("join_tournament", args=[id]))

		self.assertEqual(response.status_code, 404)

# try to delete a non existing tournament
	def test_delete_non_existing_tournament(self):
		name = "Hi there"
		max_players = 2

		self.client.login(username='testuser1', password='Password1+')
		id = 99
		response = self.client.delete(reverse("delete_tournament", args=[id]))
		self.assertEqual(response.status_code, 404)
