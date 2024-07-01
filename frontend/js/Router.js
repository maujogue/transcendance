import { isLoggedIn, toggleContentOnLogState, resetModalFormsInitListeners } from "./Utils.js";
import { injectUserData } from "./User.js";
import { initArray, importFunction, injectModule } from "./Modules.js";

export const hostname = window && window.location && window.location.hostname; 

class Page {
	constructor(name, urlPath, filePath, importJs) {
		this.name = name;
		this.urlPath = urlPath;
		this.filePath = filePath;
		this.importJs = importJs;
		this.init = null;
		this.html = null;
	}
	async fetchHtml() {
		this.html = await fetch(this.filePath).then((x) => x.text());
	}
	async fetchInit() {
		this.init = await importFunction("./pages/", this.name, this.importJs);
	}
}

const routes = [
	new Page("dashboard", "/dash", "html/Dashboard.html", true),
	new Page("sidebar", "", "html/Sidebar.html", true),
	new Page("about", "/about", "html/About.html"),
	new Page("game", "/game", "html/Game.html", true),
	new Page("emailVerified", "/emailVerified", "html/EmailVerified.html", true),
];

window.addEventListener("popstate", () => router(routes));

document.addEventListener("DOMContentLoaded", async () => {
	document.body.addEventListener("click", async (e) => await navigateOnClick(e));
	await initArray(routes);
	await initPages();
	resetModalFormsInitListeners();
});

async function router() {
	var allPages = Array.from(document.querySelectorAll(".page"));
	let newPage = routes.find((page) => page.urlPath === location.pathname);
	if (!newPage) {
		newPage = routes[0];
		history.pushState({}, '', newPage.urlPath);
	}
	var previousPage = allPages.find((x) => x.hidden == false);
	if (previousPage)
		previousPage.hidden = true;
	var newPageDiv = allPages.find(page => page.id === newPage.name);
	toggleActiveTab(location.pathname);
	if (newPageDiv)
		newPageDiv.hidden = false;
};

async function navigateTo(url) {
	history.pushState({}, null, url);
	router();
}

async function navigateOnClick(e) {
	let target = e.target;
	while (target && target.parentNode !== document.body && !target.getAttribute("href"))
		target = target.parentNode;
	if (target && target.matches("[navlink]")) {
		e.preventDefault();
		await navigateTo(target.getAttribute("href"));
	}
}

function toggleActiveTab(target) {
	var currentActive = document.querySelector(".active");
	if (currentActive != null)
		currentActive.classList.remove("active");
	if (target == "/")
		target = "/dash";
	if (target == "/dash" || target == "/game" || (target == "/about" && !isLoggedIn()))
		document.querySelector("a[href='" + target + "']").classList.add("active");
}

async function initPages() {
	var contentContainer = document.getElementById("content-container");
	contentContainer.innerHTML = "";
	setLoading(true);
	for (const page of routes) {
		if (page.name === "sidebar")
			document.getElementById("sidebar-container").innerHTML = page.html;
		else {
			contentContainer.innerHTML += `<div id="${page.name}" class="page" hidden></div>`;
			contentContainer.querySelector(`#${page.name}`).innerHTML = page.html;
		}
	};
	await injectModule();
	await toggleContentOnLogState();
	await injectUserData();
	for (const page of routes) {
		if (page.name === "game")
			contentContainer.querySelector("#game").setAttribute("tabindex", "0");
		await execPageJavascript(page.name);
	}
	toggleActiveTab(location.pathname);
	router();
	setLoading(false);
}

async function updatePage(pageName) {
	var page = routes.find((x) => x.name === pageName);
	if (page) {
		setLoading(true);
		var pageDiv = document.getElementById(pageName);
		pageDiv.innerHTML = page.html;
		await injectModule(pageName);
		await toggleContentOnLogState();
		await injectUserData();
		await execPageJavascript(pageName);
		setLoading(false);
	}

}

function setLoading(state) {
	var allPages = Array.from(document.querySelectorAll(".page"));
	var contentContainer = document.getElementById("content-container");
	var sidebarContainer = document.getElementById("sidebar-container");
	var currentPage = allPages.find((x) => x.hidden == false);
	if (state) {
		if (currentPage)
			currentPage.hidden = true;
		contentContainer.innerHTML += 
			`<div id="loadingScreen" class="position-absolute top-0 left-0 w-75 h-100 d-flex justify-content-center align-items-center">
			<div class="spinner-border" role="status"></div>
		</div>
		`;
		sidebarContainer.hidden = true;
	} else {
		document.getElementById("loadingScreen")?.remove();
		if (currentPage)
			currentPage.hidden = false;
		sidebarContainer.hidden = false;
	}
}

async function execPageJavascript(pageName) {
	let queryParams = new URLSearchParams(location.search);

	var page = routes.find((e) => e.name === pageName);
	if (page.init) {
		if (page.urlPath === location.pathname)
			await page.init(queryParams);
		else
			await page.init();
	}
}

export { navigateTo, execPageJavascript, routes, initArray, initPages, updatePage };
