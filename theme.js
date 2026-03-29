class GalaxyTheme {
  constructor() {
    this.config = {
      blurHomeBackground: false,
      useCurrSongAsHome: false,
      useHomeEverywhere: false,
      blurAllBackgrounds: false,
      showHeaderImage: false,
    };
    this.isDim = false;
    this.defImage = "https://github.com/harbassan/spicetify-galaxy/blob/main/assets/default_bg.jpg?raw=true";
    this.startImage = localStorage.getItem("galaxy:startupBg") || this.defImage;
    this.notDimPages = ["/playlist/", "/artist/", "/album/", "/folder/", "/collection/tracks"];
    this.bgContainer = null;
    this.bgImage = null;
  }

  async init() {
    if (!(Spicetify.Player?.data && Spicetify.Platform && Spicetify.CosmosAsync)) {
      setTimeout(() => this.init(), 100);
      return;
    }
    console.log("Galaxy theme starting...");

    // Clean up temp images
    Object.keys(localStorage).forEach((item) => {
      if (item.includes("galaxy:temp")) localStorage.removeItem(item);
    });

    this.parseOptions();
    this.createBackgroundElements();
    this.setupScrollListeners();
    this.setupEditButtons();
    this.setupPlaylistEditObserver();

    // Listeners
    Spicetify.Platform.History.listen(this.onPageChange.bind(this));
    Spicetify.Player.addEventListener("songchange", this.onSongChange.bind(this));

    // Initial load
    this.onPageChange(Spicetify.Platform.History.location);
  }

  parseOptions() {
    this.config.blurHomeBackground = JSON.parse(localStorage.getItem("blurHomeBackground"));
    this.config.useCurrSongAsHome = JSON.parse(localStorage.getItem("useCurrentSongAsHome"));
    this.config.useHomeEverywhere = JSON.parse(localStorage.getItem("useHomeEverywhere"));
    this.config.blurAllBackgrounds = JSON.parse(localStorage.getItem("blurAllBackgrounds"));
    this.config.showHeaderImage = JSON.parse(localStorage.getItem("showHeaderImage"));
  }

  waitForElement(els, func, timeout = 100) {
    const queries = els.map((el) => document.querySelector(el));
    if (queries.every((a) => a)) {
      func(queries);
    } else if (timeout > 0) {
      setTimeout(() => this.waitForElement(els, func, timeout - 1), 50);
    }
  }

  createBackgroundElements() {
    if (document.querySelector(".bg-main-container")) return;
    this.bgContainer = document.createElement("div");
    this.bgContainer.className = "bg-main-container";
    this.bgContainer.innerHTML = `<div class="bg-image-container"><img class="bg-main-image"></div><div class="bg-main-shadow"></div>`;
    this.bgImage = this.bgContainer.querySelector(".bg-main-image");
    document.body.prepend(this.bgContainer);
  }

  setBg(imageData) {
    if (this.bgImage) this.bgImage.src = imageData;
  }

  async fetchCurrTrackAlbumImage() {
    const data = Spicetify.Player.data.item.metadata;
    const albumUri = data.album_uri.split(":")[2];
    if (localStorage.getItem(`galaxy:tempAlbumImage:${albumUri}`)) {
      this.setBg(localStorage.getItem(`galaxy:tempAlbumImage:${albumUri}`));
      return;
    }
    this.setBg(data.image_xlarge_url);
  }

  observeEntityImage() {
    if (this.entityObserver) this.entityObserver.disconnect();
    
    this.waitForElement([".main-entityHeader-imageContainer img", ".main-entityHeader-image"], ([img]) => {
      if (img && img.src) this.setBg(img.src);
      
      this.entityObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.type === "attributes" && m.attributeName === "src") {
            this.setBg(m.target.src);
          }
        });
      });
      if (img) this.entityObserver.observe(img, { attributes: true });
    });
  }

  observeArtistImage() {
    this.waitForElement([".under-main-view", ".main-entityHeader-background"], (elements) => {
      const bannerSect = elements.find(el => el);
      if (!bannerSect) return;
      
      const getBg = (node) => {
        let bg = node.style?.backgroundImage;
        if (bg && bg.includes("url(")) this.setBg(bg.slice(5, -2).replace(/"/g, ''));
      };
      
      const div = bannerSect.querySelector("div");
      if (div) getBg(div);

      if (this.artistObserver) this.artistObserver.disconnect();
      this.artistObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.addedNodes.length) {
            const addedDiv = m.addedNodes[0].querySelector ? m.addedNodes[0].querySelector("div") : null;
            if (addedDiv) getBg(addedDiv);
          }
        });
      });
      this.artistObserver.observe(bannerSect, { childList: true });
    }, 100);
  }

  loopOptions(page) {
    const bgShadow = document.querySelector(".bg-main-shadow");
    if (!bgShadow) return;

    if (page === "/") {
      bgShadow.classList.toggle("blur-enabled", this.config.blurHomeBackground || false);
      this.config.useCurrSongAsHome ? this.fetchCurrTrackAlbumImage() : this.setBg(this.startImage);
    } else {
      bgShadow.classList.toggle("blur-enabled", this.config.blurAllBackgrounds || false);
      if (this.config.useHomeEverywhere) {
        this.config.useCurrSongAsHome ? this.fetchCurrTrackAlbumImage() : this.setBg(this.startImage);
      }
    }
    
    if (this.config.showHeaderImage && !document.querySelector("style[galaxy-showHeaderImage]")) {
      const style = document.createElement("style");
      style.setAttribute("galaxy-showHeaderImage", "");
      style.innerHTML = `
      .playlist-playlist-playlistImageContainer,
      .main-entityHeader-imageContainer { display: block; } 
      .main-entityHeader-headerText { align-items: start; }
      .main-entityHeader-title { text-align: left; }
      .main-entityHeader-shadow { box-shadow: none;}`;
      document.body.append(style);
    } else if (!this.config.showHeaderImage && document.querySelector("style[galaxy-showHeaderImage]")) {
      document.querySelector("style[galaxy-showHeaderImage]").remove();
    }
  }

  onPageChange({ pathname }) {
    const [, type, uid] = pathname.split("/");

    if (!this.config.useHomeEverywhere) {
      switch (type) {
        case "playlist":
        case "album":
          this.observeEntityImage();
          break;
        case "artist":
          this.observeArtistImage();
          break;
        case "lyrics":
          this.fetchCurrTrackAlbumImage();
          break;
      }
      if (pathname === "/collection/tracks") this.fetchCurrTrackAlbumImage();
    }

    this.isDim = !(this.notDimPages.some((page) => pathname.includes(page)) || pathname === "/");
    const bgImageWrapper = this.bgContainer.children[0];
    bgImageWrapper.style.webkitMaskImage = `linear-gradient(rgba(0, 0, 0, ${this.isDim ? 0.3 : 0.75}) 0px, rgba(0, 0, 0, 0.1) 90%)`;

    this.waitForElement([".main-topBar-topbarContentWrapper"], ([topbarWrapper]) => {
      this.isDim ? topbarWrapper.classList.add("center") : topbarWrapper.classList.remove("center");
    });
    
    // Update topbar edit button display
    this.updateEditButtonVisibility(pathname, type);

    this.loopOptions(pathname);
  }

  onSongChange() {
    const pathname = Spicetify.Platform.History.location.pathname;
    if ((pathname === "/lyrics" || pathname === "/collection/tracks") && !this.config.useHomeEverywhere) {
      this.fetchCurrTrackAlbumImage();
    }
    this.loopOptions(pathname);
  }
  
  injectScrollListener(scrollNode) {
     if(!scrollNode) return;
     scrollNode.setAttribute("fade", "bottom");
     scrollNode.addEventListener("scroll", () => {
        if (scrollNode.scrollTop === 0) {
            scrollNode.setAttribute("fade", "bottom");
        } else if (scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight <= 1) {
            scrollNode.setAttribute("fade", "top");
        } else {
            scrollNode.setAttribute("fade", "full");
        }
        
        // Dynamic dim for main scroll node
        if(!this.isDim && scrollNode.closest('.Root__main-view')) {
            let dimValue = 0.75 - scrollNode.scrollTop / 1000;
            if(dimValue < 0.3) dimValue = 0.3;
            this.bgContainer.children[0].style.webkitMaskImage = `linear-gradient(rgba(0, 0, 0, ${dimValue}) 0px, rgba(0, 0, 0, 0.1) 90%)`;
        }
     });
  }

  setupScrollListeners() {
      // Modern Spicetify / macOS 26 uses .os-viewport for OverlayScrollbars natively
      this.waitForElement([".Root__main-view .os-viewport"], ([scrollNode]) => this.injectScrollListener(scrollNode));
      this.waitForElement([".Root__nav-bar .os-viewport"], ([scrollNode]) => this.injectScrollListener(scrollNode));
      this.waitForElement([".Root__right-sidebar .os-viewport"], ([scrollNode]) => this.injectScrollListener(scrollNode));
      
      // Fallback for older clients
      this.waitForElement([".Root__main-view .main-view-container__scroll-node > div:nth-child(2)"], ([scrollNode]) => this.injectScrollListener(scrollNode));
  }

  updateEditButtonVisibility(pathname, type) {
    const pBtn = document.getElementById("galaxy-playlist-edit");
    const hBtn = document.getElementById("galaxy-home-edit");
    if(pBtn) pBtn.style.display = (type === "playlist") ? "flex" : "none";
    if(hBtn) hBtn.style.display = (pathname === "/") ? "flex" : "none";
  }

  setupEditButtons() {
    // Spicetify.Topbar.Button is deprecated in newer versions or easily broken. Provide manual topbar injection as robust fallback.
    const createBtn = (id, iconText, callback) => {
        let btn = new Spicetify.Topbar.Button(id, iconText, callback);
        btn.element.id = id;
        return btn;
    }
    
    // Instead of string 'edit', we use standard Spicetify topbar method or fallback
    try {
        const playlistEdit = createBtn("galaxy-playlist-edit", "edit", () => {
            document.querySelector(".main-entityHeader-titleButton")?.click();
        });
        const homeEdit = createBtn("galaxy-home-edit", "edit", () => {
            this.openHomeSettingsModal();
        });
    } catch(err) { console.log("Failed to create native Topbar buttons"); }
  }

  openHomeSettingsModal() {
     // Settings modal UI logic translated
     const content = document.createElement("div");
     content.innerHTML = `<div class="main-playlistEditDetailsModal-albumCover" id="home-select">
         <div class="main-entityHeader-image" draggable="false">
             <img aria-hidden="false" draggable="false" loading="eager" class="main-image-image main-entityHeader-image main-entityHeader-shadow">
         </div>
         <div class="main-playlistEditDetailsModal-imageChangeButton">
            <div class="main-editImage-buttonContainer">
               <button class="main-editImageButton-image main-editImageButton-overlay" aria-haspopup="true" type="button">
                  <div class="main-editImageButton-icon icon"><svg role="img" height="48" width="48" aria-hidden="true" viewBox="0 0 24 24" class="Svg-sc-1bi12j5-0 EQkJl"><path d="M17.318 1.975a3.329 3.329 0 114.707 4.707L8.451 20.256c-.49.49-1.082.867-1.735 1.103L2.34 22.94a1 1 0 01-1.28-1.28l1.581-4.376a4.726 4.726 0 011.103-1.735L17.318 1.975zm3.293 1.414a1.329 1.329 0 00-1.88 0L5.159 16.963c-.283.283-.5.624-.636 1l-.857 2.372 2.371-.857a2.726 2.726 0 001.001-.636L20.611 5.268a1.329 1.329 0 000-1.879z"></path></svg><span class="Type__TypeElement-goli3j-0 gAmaez main-editImageButton-copy">Choose photo</span></div>
               </button>
            </div>
         </div>
     </div>`;
     
     const optionList = document.createElement("div");
     const createOption = (name, desc, defVal) => {
         const optionRow = document.createElement("div");
         optionRow.classList.add("galaxyOptionRow");
         optionRow.innerHTML = `<span class="galaxyOptionDesc">${desc}</span><button class="galaxyOptionToggle"><span class="toggleWrapper"><span class="toggle"></span></span></button>`;
         optionRow.setAttribute("name", name);
         optionRow.querySelector("button").addEventListener("click", () => {
            optionRow.querySelector(".toggle").classList.toggle("enabled");
         });
         const isEnabled = JSON.parse(localStorage.getItem(name)) ?? defVal;
         optionRow.querySelector(".toggle").classList.toggle("enabled", isEnabled);
         optionList.append(optionRow);
     };

     const srcInput = document.createElement("input");
     srcInput.type = "text";
     srcInput.classList.add("main-playlistEditDetailsModal-textElement", "main-playlistEditDetailsModal-titleInput");
     srcInput.id = "src-input";
     srcInput.placeholder = "Banner image URL (recommended)";
     content.append(srcInput);

     createOption("useCurrentSongAsHome", "Use currently playing song as home bg", false);
     createOption("useHomeEverywhere", "Use the home bg everywhere", false);
     createOption("blurHomeBackground", "Blur the home bg", false);
     createOption("blurAllBackgrounds", "Blur the bg on other pages", false);
     createOption("showHeaderImage", "Show the playlist/album img in header", false);

     content.append(optionList);

     const img = content.querySelector("img");
     img.src = localStorage.getItem("galaxy:startupBg") || this.defImage;
     
     const bannerInput = document.createElement("input");
     bannerInput.type = "file";
     bannerInput.className = "banner-input";
     bannerInput.accept = "image/*";
     bannerInput.onchange = () => {
        if (!bannerInput.files.length) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            srcInput.value = "";
        };
        reader.readAsDataURL(bannerInput.files[0]);
     };
     
     const editButton = content.querySelector(".main-editImageButton-image");
     editButton.onclick = () => bannerInput.click();

     const saveButton = document.createElement("button");
     saveButton.id = "home-save";
     saveButton.innerHTML = "Save Config";
     saveButton.addEventListener("click", () => {
         this.startImage = srcInput.value || img.src;
         try {
             localStorage.setItem("galaxy:startupBg", this.startImage);
         } catch(e) { Spicetify.Snackbar.enqueueSnackbar("Image file too large"); }
         
         [...optionList.children].forEach((opt) => {
             localStorage.setItem(opt.getAttribute("name"), opt.querySelector(".toggle").classList.contains("enabled"));
         });
         this.parseOptions();
         this.loopOptions("/");
         Spicetify.PopupModal.hide();
     });
     
     content.append(saveButton);
     Spicetify.PopupModal.display({ title: "Galaxy Settings", content: content });
  }

  setupPlaylistEditObserver() {
      // Observe the edit playlist popup to inject custom background input
      const bannerInput = document.createElement("input");
      bannerInput.type = "file";
      bannerInput.className = "banner-input";
      bannerInput.accept = "image/*";
      
      const editObserver = new MutationObserver((mutation_list) => {
          for (let mutation of mutation_list) {
              if (mutation.addedNodes.length) {
                  const popupContent = mutation.addedNodes[0].querySelector(".main-playlistEditDetailsModal-content");
                  if (!popupContent) continue;
                  
                  const coverSelect = popupContent.querySelector(".main-playlistEditDetailsModal-albumCover");
                  if(!coverSelect) continue;
                  
                  const bannerSelect = coverSelect.cloneNode(true);
                  bannerSelect.id = "banner-select";
                  
                  const [, , uid] = Spicetify.Platform.History.location.pathname.split("/");
                  const base64 = localStorage.getItem("galaxy:playlistBg:" + uid);
                  
                  if (base64) {
                      bannerSelect.querySelector("img").src = base64;
                      bannerSelect.querySelector("img").removeAttribute("srcset");
                  }
                  
                  const srcInput = document.createElement("input");
                  srcInput.type = "text";
                  srcInput.classList.add("main-playlistEditDetailsModal-textElement", "main-playlistEditDetailsModal-titleInput");
                  srcInput.id = "src-input";
                  srcInput.placeholder = "Banner image URL (recommended)";
                  
                  bannerSelect.querySelector(".main-playlistEditDetailsModal-imageDropDownButton")?.remove();
                  
                  popupContent.append(bannerSelect);
                  popupContent.append(bannerInput);
                  popupContent.append(srcInput);
                  
                  const editButton = bannerSelect.querySelector(".main-editImageButton-image");
                  if(editButton) {
                      editButton.onclick = () => bannerInput.click();
                  }
                  
                  bannerInput.onchange = () => {
                      if (!bannerInput.files.length) return;
                      const reader = new FileReader();
                      reader.onload = (e) => {
                          bannerSelect.querySelector("img").src = e.target.result;
                          srcInput.value = "";
                      };
                      reader.readAsDataURL(bannerInput.files[0]);
                  };
                  
                  const saveBtn = popupContent.querySelector(".main-playlistEditDetailsModal-save button");
                  if(saveBtn) {
                      saveBtn.addEventListener("click", () => {
                          const val = srcInput.value || bannerSelect.querySelector("img").src;
                          if (val && val !== coverSelect.querySelector("img").src) {
                              try { localStorage.setItem("galaxy:playlistBg:" + uid, val); } catch(e) {}
                          }
                          this.getPlaylistImage(uid);
                      });
                  }
              }
          }
      });
      editObserver.observe(document.body, { childList: true });
  }

}

// Initialize Theme
new GalaxyTheme().init();
