import { resetForm, toggleConfirmPasswordModal, inputInitListeners } from "./DashboardUtils.js";
import { showAlert } from "./Utils.js";
import { injectUserData } from "./User.js";
import { hostname } from "./Router.js";

async function get_csrf_token() {
	return fetch(`https://${hostname}:8000/api/users/get_csrf_token/`, {
		method: "GET",
		credentials: "include",
	})
		.then((response) => response.json())
		.then((data) => data.csrfToken)
		.catch((error) => {
			console.error("get csrf token fail", error);
		});
}

async function runEndPoint(endpoint, method, fetchBody) {
	return fetch(`https://${hostname}:8000/api/` + endpoint, {
		method: method,
		headers: {
			"X-CSRFToken": await get_csrf_token(),
			Accept: "application/json",
		},
		credentials: "include",
		body: fetchBody,
	})
		.then((response) => {
			return response.json().then((data) => {
				return { statusCode: response.status, data };
			});
		})
		.catch((error) => {
			console.error("Authentification failed", error);
			return error;
		});
}

async function updateInfo(endpoint, fetchBody, modalToDismiss) {
	var response = await runEndPoint(endpoint, "POST", fetchBody);
	var data = response.data;

	if (response.statusCode === 200) {
		showAlert(data.status, true);
		toggleConfirmPasswordModal(modalToDismiss);
		inputInitListeners();
		resetForm();
		injectUserData();
	} else if (data.error && data.error.length > 0) showAlert(data.error);
	else showAlert("Profile update Error");
	return response;
}

export { get_csrf_token, runEndPoint, updateInfo }