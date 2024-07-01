import { get_csrf_token } from "./ApiCalls.js";
import { isLoggedIn } from "./Utils.js";
import { hostname } from "./Router.js";

async function injectUserData(divToFill = null, username = null) {
	if (await isLoggedIn())
	{
		var userInfos = await getUserData(null, username);
		if(!divToFill)
			divToFill = document;
		Object.keys(userInfos).forEach((info) => {
			var usernameDivs = divToFill.querySelectorAll("." + info + "Dynamic");
			usernameDivs.forEach((div) => {
				if (div.tagName === "INPUT") div.value = userInfos[info];
				else if (div.tagName === "IMG") div.setAttribute("src", "data:image/png;base64," + userInfos[info]);
				else div.innerHTML = userInfos[info];
			});
		});
	}
}

async function getUserData(dataElement, username) {
	if (username)
    	var route = `https://${hostname}:8000/api/users/get_user_data/${username}/`;
	else
		var route = `https://${hostname}:8000/api/users/get_user_data/`;
  return fetch(route, {
    method: "GET",
    headers: {
      "X-CSRFToken": await get_csrf_token(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    credentials: "include",
  })
    .then((response) =>
      response.json().then((data) => ({ statusCode: response.status, data }))
    )
    .then(({ statusCode, data }) => {
      if (statusCode === 200) {
        if (dataElement) 
          return data.user[dataElement];
        else
          return data.user;
      } else 
        console.log("User not Logged in:", data.error);
        return null;
    })
    .catch((error) => {});
}

export { getUserData, injectUserData };
