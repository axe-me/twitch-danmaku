(function() {

	// show icon
	chrome.runtime.sendMessage({action: "showIcon"}, function(response) {});

	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		if (request.action == "stateChange") {
			stopDanmaku();
			isChatReady = false;
			isPlayerReady = false;
			init();
		}
	});
	var testCounter = 0;
	MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

	var chkActionItv = null;
	var chkChatItv = null;
	var chkPlayerItv = null

	var isChatReady = false;
	var isPlayerReady = false;
	var isDanmakuOn = true;

	var chatOb = new MutationObserver(newChatMsgHandler);
	var chatObConfig = { childList: true };

	var disp = null;

	var dmBtn = "<span><a class='button primary dark' id='dmTogglelBtn'><span>Turn Danmaku OFF</span></a></span>"

	/***************Construct Danmaku Object*********************/
	var Danmaku = function (basicInfo) {
		this.color = basicInfo.color;
		this.content = basicInfo.content;
		this.dmLength = basicInfo.dmLength;
		this.id = "dm" + Date.now();
		this.markUp = "<span>I am a moe danmaku.</span>";
	}

	Danmaku.prototype.updateMarkup = function(top, left) {
		this.markUp = "<div id='"+this.id+"' class='danmaku-item'"+
			" style='color:"+ this.color +";top:"+top+"px;left:"+left+"px;width:"+this.dmLength+"px;'>"+ this.content +"</div>";
	}

	Danmaku.prototype.putOnScreen = function() {
		$(".player-fullscreen-overlay").append(this.markUp);
	};

	/************************************************************/

	/********************** Danmaku dispatcher **********************/
	var DMDispatcher = function () {
		this.containerH = $(".player-fullscreen-overlay").height();
		this.containerW = $(".player-fullscreen-overlay").width();

		this.tracks = new Array(Math.floor(this.containerH/25));
		for (var i = 0; i < this.tracks.length; i++) {
			this.tracks[i] = {
				ready: true,
				waitTime: 0,
				top: i*25 + 15
			}
		}
	}

	DMDispatcher.prototype.enterQ = function(dm) {
		var that = this; // a reference to tracks, will be used in animation callbacks.
		var containerW = $(".player-fullscreen-overlay").width();

		var findOneSpot = false;
		var idx = 0;
		for (var i = 0; i < that.tracks.length; i++) {
			if (that.tracks[i].ready) {
				idx = i;
				findOneSpot = true;
				break;
			}
		}
		if (!findOneSpot) {
			idx = Math.floor(Math.random()*that.tracks.length);
		}
		var currentTrack = that.tracks[idx];
		dm.top = currentTrack.top;
		dm.updateMarkup(currentTrack.top, containerW);
		dm.putOnScreen();
		var currentWaitTime = currentTrack.waitTime;
		//var dm.dmLength = $("#"+dm.id).width();
		var multiplier = dm.dmLength/600;
		multiplier = multiplier<0.9?0.9:multiplier;	// min speed for short text
		multiplier = multiplier>1.5?1.5:multiplier; //max speed for long text
		var dur = 15000 * multiplier;
		
		var thisDmWaitTime = dm.dmLength/(containerW/dur);
		currentTrack.waitTime += thisDmWaitTime;
		var scrollLength = dm.dmLength + containerW;
		
		$("#"+dm.id)
			.animate({
				"left": "-="+scrollLength+"px"
			},{
				specialEasing: {
					left: "linear"
				},
				duration: dur,
				start: function () {
					currentTrack.ready = false;
					setTimeout(function () {
						currentTrack.waitTime -= thisDmWaitTime;
						currentTrack.ready = true;
					}, thisDmWaitTime);
				},
				complete: function () {
					$("#"+dm.id).remove();
				}
			});
	};

	/****************************************************************/
	
	$( document ).ready(function () {
		init();
	});

	function init () {
		chkActionItv = setInterval(insertToggleBtn, 500);
		chkChatItv = setInterval(checkChat, 500);
		chkPlayerItv = setInterval(checkPlayer, 500);
	}

	function checkPlayer () {
		if ( $("#player").length ) {
    		clearInterval(chkPlayerItv);
    		isPlayerReady = true;
    	};
	}

	function checkChat () {
		if ( $(".chat-lines").length ) {
    		clearInterval(chkChatItv);
    		isChatReady = true;
    		startDanmaku();
    	};
	}
    
    function insertToggleBtn () {
    	if ( $(".channel-actions").length ) {
    		clearInterval(chkActionItv);
    		if ( $("#dmTogglelBtn").length === 0 ) {
	    		$(".channel-actions").append(dmBtn);
	    		$( "#dmTogglelBtn" ).click(toggleDanmu);
    		};
    	};
    }

    function toggleDanmu () {
    	isDanmakuOn = !isDanmakuOn;
    	if (isDanmakuOn) {
    		$( "#dmTogglelBtn span" ).text("Turn Danmaku OFF");
    		startDanmaku();
    	} else {
    		$( "#dmTogglelBtn span" ).text("Turn Danmaku ON");
    		stopDanmaku();
    	}
    }

    function newChatMsgHandler (mutations) {
    	mutations.forEach(function(mutation) {
    		var numOfNodeAdded = mutation.addedNodes.length;
    		var currNode= null;
			if ( numOfNodeAdded > 0) {
				for (var i = 0; i < numOfNodeAdded; i++) {
					if (mutation.addedNodes[i].className === 'ember-view') {
						currNode = mutation.addedNodes[i];
						var newDanmaku = {
							color: currNode.querySelector("li .from").style.color,
							content: currNode.querySelector("li .message").innerHTML
						}
						// calculate danmaku length
						var emojiCount = currNode.querySelector("li .message").querySelectorAll("img").length;
						var pureTextLength = currNode.querySelector("li .message").textContent.length;
						newDanmaku.dmLength =  (pureTextLength + emojiCount*4)*22; //22 = fontsize
						if (isDanmakuOn) {
							disp.enterQ(new Danmaku(newDanmaku));
						}
					}
				};
			};
		});
    }

    function startDanmaku () {
    	console.log("Start Danmaku.");
    	disp = new DMDispatcher();
       	var chatRoom = document.querySelector('.chat-lines');
    	if ( chatRoom !== null ) {
    		console.log("Start observing.");
    		chatOb.observe(chatRoom, chatObConfig);
    	}
    }

    function stopDanmaku () {
    	console.log("Stop Danmaku.");
		chatOb.disconnect();
		disp = null;
		$(".player-fullscreen-overlay").text(" ");
    }

})();
