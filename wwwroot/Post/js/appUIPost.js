const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let WordString = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let pageManager;
let itemLayout;

let waiting = null;
let waitingGifTrigger = 2000;
function addWaitingGif() {
  clearTimeout(waiting);
  waiting = setTimeout(() => {
    $("#itemsPanel").append(
      $(
        "<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"
      )
    );
  }, waitingGifTrigger);
}
function removeWaitingGif() {
  clearTimeout(waiting);
  $("#waitingGif").remove();
}

Init_UI();

async function Init_UI() {
  itemLayout = {
    width: $("#sample").outerWidth(),
    height: $("#sample").outerHeight(),
  };
  pageManager = new PageManager(
    "scrollPanel",
    "itemsPanel",
    itemLayout,
    renderPosts
  );
  compileCategories();
  $("#researchPost").on("click", async function () {
    showResearchBar();
  });
  $("#createPost").on("click", async function () {
    renderCreatePostForm();
  });
  $("#abort").on("click", async function () {
    showPosts();
  });
  $("#aboutCmd").on("click", function () {
    renderAbout();
  });
  showPosts();
  start_Periodic_Refresh();
}
function showResearchBar() {
  if ($("#ResearchBar").is(":visible")) {
    $("#ResearchBar").hide();
  } else {
    $("#ResearchBar").show();
  }
}
function changeResearch() {
  WordString = document.getElementById("SearchBar").value;
  console.log("Texte dans la barre de recherche :", WordString);
  pageManager.reset();
}
function showPosts() {
  $("#actionTitle").text("Liste des favoris");
  $("#scrollPanel").show();
  $("#abort").hide();
  $("#postForm").hide();
  $("#aboutContainer").hide();
  WordString = "";
  document.getElementById("SearchBar").value = WordString;
  $("#ResearchBar").hide();

  $("#createPost").show();
  hold_Periodic_Refresh = false;
}
function hidePosts() {
  $("#scrollPanel").hide();
  $("#createPost").hide();
  $("#abort").show();
  hold_Periodic_Refresh = true;
}
function start_Periodic_Refresh() {
  setInterval(async () => {
    if (!hold_Periodic_Refresh) {
      let etag = await Posts_API.HEAD();
      if (currentETag != etag) {
        currentETag = etag;
        await pageManager.update(false);
        compileCategories();
      }
    }
  }, periodicRefreshPeriod * 1000);
}
function renderAbout() {
  hidePosts();
  $("#actionTitle").text("À propos...");
  $("#aboutContainer").show();
}
function updateDropDownMenu() {
  let DDMenu = $("#DDMenu");
  let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
  DDMenu.empty();
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `)
  );
  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  categories.forEach((category) => {
    selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `)
    );
  });
  DDMenu.append($(`<div class="dropdown-divider"></div> `));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `)
  );
  $("#aboutCmd").on("click", function () {
    renderAbout();
  });
  $("#allCatCmd").on("click", function () {
    showPosts();
    selectedCategory = "";
    updateDropDownMenu();
    pageManager.reset();
  });
  $(".category").on("click", function () {
    showPosts();
    selectedCategory = $(this).text().trim();
    updateDropDownMenu();
    pageManager.reset();
  });
}
async function compileCategories() {
  categories = [];
  let response = await Posts_API.GetQuery("?fields=category&sort=category");
  if (!Posts_API.error) {
    let items = response.data;
    if (items != null) {
      items.forEach((item) => {
        if (!categories.includes(item.Category)) categories.push(item.Category);
      });
      updateDropDownMenu(categories);
    }
  }
}
async function renderPosts(queryString) {
  let endOfData = false;
  queryString += "&sort=Creation,desc";
  if (selectedCategory != "") queryString += "&category=" + selectedCategory;
  
  if (WordString != "" && WordString !=null) {
    WordString = WordString.trim();

    WordString = WordString.replace(/\s+/g, ",");
   // queryString += "&sort=keywords";
    queryString += "&keywords=" + WordString;
    console.log(queryString);
  }
  addWaitingGif();
  let response = await Posts_API.Get(queryString);
  if (!Posts_API.error) {
    currentETag = response.ETag;
    let Posts = response.data;
    if (Posts.length > 0) {
      Posts.forEach((Post) => {
        $("#itemsPanel").append(renderPost(Post));
      });
      $(".editCmd").off();
      $(".editCmd").on("click", function () {
        renderEditPostForm($(this).attr("editPostId"));
      });
      $(".deleteCmd").off();
      $(".deleteCmd").on("click", function () {
        renderDeletePostForm($(this).attr("deletePostId"));
      });
    } else endOfData = true;
  } else {
    renderError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
  return endOfData;
}

function renderError(message) {
  hidePosts();
  $("#actionTitle").text("Erreur du serveur...");
  $("#errorContainer").show();
  $("#errorContainer").append($(`<div>${message}</div>`));
}
function renderCreatePostForm() {
  renderPostForm();
}
async function renderEditPostForm(id) {
  addWaitingGif();
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let Post = response.data;
    if (Post !== null) renderPostForm(Post);
    else renderError("Post introuvable!");
  } else {
    renderError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
}
async function renderDeletePostForm(id) {
  hidePosts();
  $("#actionTitle").text("Retrait");
  $("#postForm").show();
  $("#postForm").empty();
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let Post = response.data;
    const timestamp = Post.Creation;
    const date = new Date(timestamp); // Convertit le timestamp en objet Date

    // Format de la date, par exemple : "YYYY-MM-DD"
    const formattedDate = date.toISOString().split("T")[0];
    if (Post !== null) {
      $("#postForm").append(`
     <div class="PostRow" id='${Post.Id}'>
        <div class="PostContainer noselect">
                            <div class="PostLayout">
                                <span class="PostCategory">${Post.Category}</span>
                                <div class="Post">
                                    <span class="PostTitle">${Post.Title}</span>
                                </div>
                                <div class="Post">
                                <div class="imgWrap">
                                    <div class="PostImage">
                                        <a href="${Post.Image}" target="blank"><img class="Post-image" src=${Post.Image} alt="asa"/></a>
                                    </div>
                                </div>
                                </div>
                                <div class="Post">
                                                <span class="PostTexte " id="${Post.Id}_T">${Post.Text}</span>
                                </div>
                                <!-- Champ de création -->
                                <span class="PostCreation">Date de creation: <span data-creation="timestamp">${formattedDate}</span></span>
                            </div>
                            <div class="PostCommandPanel">
                                <span class="editCmd cmdIcon fa fa-pencil" editPostId="${Post.Id}"
                                    title="Modifier ${Post.Title}"></span>
                                <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${Post.Id}"
                                    title="Effacer ${Post.Title}"></span>
                            </div>
                        </div>
    </div>   
            <br>
            <input type="button" value="Effacer" id="deletePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </div>    
        `);
      $("#deletePost").on("click", async function () {
        await Posts_API.Delete(Post.Id);
        if (!Posts_API.error) {
          showPosts();
          await pageManager.update(false);
          compileCategories();
        } else {
          console.log(Posts_API.currentHttpError);
          renderError("Une erreur est survenue!");
        }
      });
      $("#cancel").on("click", function () {
        showPosts();
      });
    } else {
      renderError("Post introuvable!");
    }
  } else {
    console.log("alloDelet");
    renderError(Posts_API.currentHttpError);
  }
}
function getFormData($form) {
  const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
  var jsonObject = {};
  $.each($form.serializeArray(), (index, control) => {
    jsonObject[control.name] = control.value.replace(removeTag, "");
  });
  return jsonObject;
}
function newPost() {
  Post = {};
  Post.Id = 0;
  Post.Title = "";
  Post.Text = "";
  Post.Category = "";
  Post.Creation = new Date().getTime();;
  return Post;
}
function renderPostForm(Post = null) {
  hidePosts();
  let create = Post == null;

  if (create) {
    Post = newPost();
  }

  $("#actionTitle").text(create ? "Création" : "Modification");

  $("#postForm").show();
  $("#postForm").empty();
  $("#postForm").append(`
        <form class="form" id="PostForm">
            <br>
            <input type="hidden" name="Id" value="${Post.Id}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${Post.Category}"
            />
            <br>
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control Alpha"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${Post.Title}"
            />
            <label for="Texte" class="form-label">Texte</label>
            <textarea 
                class="form-control Alpha"
                name="Text" 
                id="Text" 
                placeholder="Contenue"
                required
                data-require-message="Veuillez entrer un Texte"
                data-invalid-message="Le Texte comporte un caractère illégal">${Post.Text}</textarea>

             <!-- nécessite le fichier javascript 'imageControl.js' -->
            <label class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${Post.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
            <input type="hidden"  name="Creation"  id="Creation"  value="${Post.Creation}"/>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
  initImageUploaders();
  initFormValidation();

  $("#PostForm").on("submit", async function (event) {
    event.preventDefault();
    let Post = getFormData($("#PostForm"));
    Post = await Posts_API.Save(Post, create);
    if (!Posts_API.error) {
      showPosts();
      await pageManager.update(false);
      compileCategories();
      pageManager.scrollToElem(Post.Id);
    } else renderError("Une erreur est survenue!");
  });
  $("#cancel").on("click", function () {
    showPosts();
  });
}
function makeFavicon(url, big = false) {
  // Utiliser l'API de google pour extraire le favicon du site pointé par url
  // retourne un élément div comportant le favicon en tant qu'image de fond
  ///////////////////////////////////////////////////////////////////////////
  if (url.slice(-1) != "/") url += "/";
  let faviconClass = "favicon";
  if (big) faviconClass = "big-favicon";
  url = "http://www.google.com/s2/favicons?sz=64&domain=" + url;
  return `<div class="${faviconClass}" style="background-image: url('${url}');"></div>`;
}
function toggleContent(id) {
    const postText = document.getElementById(id+"_T");
    console.log("all");
    console.log(id);
    if (postText.classList.contains('expanded')) {
        postText.classList.remove('expanded');
    } else {
        postText.classList.add('expanded');
    }
    }
function renderPost(Post) {
   
  const timestamp = Post.Creation;

  const date = new Date(timestamp); // Convertit le timestamp en objet Date

  // Format de la date, par exemple : "YYYY-MM-DD"
  const formattedDate = date.toISOString().split("T")[0];
  
  return $(`
     <div class="PostRow" id='${Post.Id}'>
        <div class="PostContainer noselect">
                            <div class="PostLayout">
                                <span class="PostCategory">${Post.Category}</span>
                                <div class="Post">
                                    <span class="PostTitle">${Post.Title}</span>
                                </div>
                                <div class="Post">
                                <div class="imgWrap">
                                    <div class="PostImage">
                                        <a href="${Post.Image}" target="blank"><img class="Post-image" src=${Post.Image} alt="asa"/></a>
                                    </div>
                                </div>
                                </div>
                                <div class="Post">
                                                <span class="PostTexte " id="${Post.Id}_T">${Post.Text}</span>
                                </div>
                                <button class="show-more" id="toggleButton" editPostId="${Post.Id}"  onclick="toggleContent('${Post.Id}')">montrer plus/moin</button>
                                
                                <!-- Champ de création -->
                                <span class="PostCreation">Date de creation: <span data-creation="timestamp">${formattedDate}</span></span>
                            </div>
                            <div class="PostCommandPanel">
                                <span class="editCmd cmdIcon fa fa-pencil" editPostId="${Post.Id}"
                                    title="Modifier ${Post.Title}"></span>
                                <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${Post.Id}"
                                    title="Effacer ${Post.Title}"></span>
                            </div>
                        </div>
    </div>           
    `);
}
