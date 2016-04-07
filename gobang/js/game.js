//  ========== 
//  =name:gobang 游戏 
//  =anthor:刘敬
//  =last modify date:2016-04-06
//  ========== 
(function(win) {

	var gb = function(option) {

		var self = this,
			canObj = document.getElementById("cc"),
			can = canObj.getContext("2d");
		self.contextObj = canObj;
		self.context = can;

		if (!self.context) {
			alert("浏览器不支持html5");
			return;
		};

		self.Opt = {
			lineColor: "green",
			chessType: 1, //1 色彩棋子 2 仿真棋子
			playAName: "play1",
			playBName: "play2",
			playAColor: "red",
			playBColor: "blue",
			playAImg: "img/playA.png",
			playBImg: "img/playB.png",
			backColorORImg: "default"
		};

		self.operate;

		//合并属性
		for (var a in option) {
			//console.log(opt[a]);
			self.Opt[a] = option[a];
		};

		//私有变量
		var my = {};
		my.gameover = false;
		//棋盘相关
		my.baseWidth = 30;
		my.cw = self.contextObj.offsetWidth; //棋盘宽
		my.ch = self.contextObj.offsetHeight; //高
		my.xlen = Math.ceil(my.cw / my.baseWidth); //行数
		my.ylen = Math.ceil(my.ch / my.baseWidth); //列
		my.chessRadius = 14; //棋子半径

		my.switcher = 1; //由谁下棋了 1-a 2-b 3-computer
		my.winer = -1; //赢家，值参考my.switcher
		my.playScoreA=0;
		my.playScoreB=0;
		//x，y 正方形数量
		my.rectNum = my.xlen;
		//存储已下的点
		my.rectMap = [];
		my.eventBinded = false;
		my.currChessBackImg = null;
		my.currChessAImg = null;
		my.currChessBImg = null;
		my.currDrawChessImg = null;

		self.start = function() {
			init();
			my.gameover = false;

			if (self.info && typeof self.info == "function") {
				self.info(self.Opt);
			}
		};

		/**
		 * 初始化一些数据
		 */
		function init() {

			if (self.Opt.chessType == 2 && my.currChessAImg == null) {
				my.currChessAImg = new Image();
				my.currChessAImg.src = self.Opt.playAImg;
				my.currChessBImg = new Image();
				my.currChessBImg.src = self.Opt.playBImg;

			}

			//初始化二维地图
			for (var i = 0; i < my.rectNum; i++) {
				my.rectMap[i] = [];
				for (var j = 0; j < my.rectNum; j++) {

					my.rectMap[i][j] = -1;
				}

			}

			self.Opt._map = my.rectMap;

			//初始化canvas一些参数

			drawChessboard();

			bindEvent();
		}

		//		self.paint = function() {
		//
		//			//window.requestAnimationFrame(drawChessboard);
		//		};

		/**
		 * 游戏逻辑
		 */
		function logic(loc) {

			var c2d = calc2dPoint(loc);

			var va = my.rectMap[c2d.I][c2d.J];
			if (va < 0) {
				my.rectMap[c2d.I][c2d.J] = my.switcher;
				c2d.player = my.switcher;
				if (my.switcher === 1) {
					can.fillStyle = self.Opt.playAColor;
					can.strokeStyle = self.Opt.playAColor;
					my.currDrawChessImg = my.currChessAImg;
					my.switcher = 2;
				} else {
					can.fillStyle = self.Opt.playBColor;
					can.strokeStyle = self.Opt.playBColor;
					my.currDrawChessImg = my.currChessBImg;
					my.switcher = 1;
				}

				drawChessman(c2d);
				if (isWin(c2d)) {
					console.log((my.winer === 1 ? "A" : "B") + "赢了！");
					c2d.winer = my.winer;
					if (my.winer == 1) {
						my.playScoreA++;
					}else
					{
						my.playScoreB++;
					}
					c2d.playScoreA=my.playScoreA;
					c2d.playScoreB=my.playScoreB;
				}
				if (self.operate && typeof self.operate == "function") {
					self.operate(self.Opt, c2d);
				}
			}

		};

		self.restart = function() {
			//重置二维地图
			for (var i = 0; i < my.rectNum; i++) {
				for (var j = 0; j < my.rectNum; j++) {
					my.rectMap[i][j] = -1;
				}
			}

			self.Opt._map = my.rectMap;

			//初始化canvas一些参数

			drawChessboard();
			my.switcher = 1; //由谁下棋了 1-a 2-b 3-computer
			my.winer = -1; //赢家，值参考my.switcher
			my.gameover = false;
	
		};

		/**
		 * 判断是否有玩家胜出
		 * @param {Object} c2d
		 */
		function isWin(c2d) {
			//四个放心计数 竖 横 左斜 右斜
			var hcount = 0,
				vcount = 0,
				lbhcount = 0,
				rbhcount = 0,
				temp = 0;

			//左-1
			for (var i = c2d.I; i >= 0; i--) {
				temp = my.rectMap[i][c2d.J];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				hcount++;
			}
			//右-1
			for (var i = c2d.I + 1; i < my.rectMap.length; i++) {
				temp = my.rectMap[i][c2d.J];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				hcount++;
			}
			//上-2
			for (var j = c2d.J; j >= 0; j--) {
				temp = my.rectMap[c2d.I][j];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				vcount++;
			}
			//下-2
			for (var j = c2d.J + 1; j < my.rectMap[c2d.I].length; j++) {
				temp = my.rectMap[c2d.I][j];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				vcount++;
			}
			//左上
			for (var i = c2d.I, j = c2d.J; i >= 0, j >= 0; i--, j--) {
				if (i < 0 || j < 0) break;
				temp = my.rectMap[i][j];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				lbhcount++;
			}
			//右下
			if (c2d.I < my.rectMap.length - 1 && c2d.I < my.rectMap[0].length - 1) {
				for (var i = c2d.I + 1, j = c2d.J + 1; i < my.rectMap.length, j < my.rectMap[0].length; i++, j++) {
					temp = my.rectMap[i][j];
					if (temp < 0 || temp !== c2d.player) {
						break;
					}
					lbhcount++;
				}
			}
			//右上
			for (var i = c2d.I, j = c2d.J; i < my.rectMap.length, j >= 0; i++, j--) {
				if (i >= my.rectMap.length || j < 0) break;
				temp = my.rectMap[i][j];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				rbhcount++;
			}
			//左下
			if (c2d.I >= 1 && c2d.J < my.rectMap[0].length - 1) {
				for (var i = c2d.I - 1, j = c2d.J + 1; i > 0, j < my.rectMap[0].length; i--, j++) {
					temp = my.rectMap[i][j];
					if (temp < 0 || temp !== c2d.player) {
						break;
					}
					rbhcount++;
				}
			}

			if (hcount >= 5 || vcount >= 5 || lbhcount >= 5 || rbhcount >= 5) {
				my.winer = c2d.player;
				my.gameover = true;
				return true;
			}

			return false;
		}

		/**
		 * 画棋盘
		 */
		function drawChessboard() {
			can.save();

			can.clearRect(0, 0, my.cw, my.ch);

			if (self.Opt.backColorORImg === "default") {
				self.contextObj.style.backgroundColor = self.Opt.backColorORImg;
				drawline();
			} else {
				if (my.currChessBackImg==null) {
					my.currChessBackImg = new Image();
					my.currChessBackImg.src = self.Opt.backColorORImg;
					my.currChessBackImg.onload = function() {
						can.drawImage(my.currChessBackImg, 0, 0, 600, 600);
						drawline();
					}
				} else {
					can.drawImage(my.currChessBackImg, 0, 0, 600, 600);
					drawline();
				}
			}

			function drawline() {
				can.fillStyle = self.Opt.lineColor;
				can.strokeStyle = self.Opt.lineColor;
				can.lineWidth = 2;
				can.lineCap = "round";
				can.lineJoin = "round";

				//外壳
				can.strokeRect(0, 0, my.cw, my.ch);
				can.beginPath();
				//竖线
				for (var i = 0; i < my.xlen; i++) {
					can.moveTo(i * my.baseWidth, 0);
					can.lineTo(i * my.baseWidth, my.ch);
				}
				//横线
				for (var i = 0; i < my.ylen; i++) {
					can.moveTo(0, i * my.baseWidth);
					can.lineTo(my.cw, i * my.baseWidth);
				}
				//can.fill();
				can.closePath();
				can.stroke();
			}

			can.restore();
		};

		/**
		 * 画棋子
		 * @param {Object} loc 鼠标点击位置
		 */
		function drawChessman(c2d) {

			poffset = my.baseWidth / 2;
			can.save();
			if (self.Opt.chessType == 1) {
				drawColorchess();
			} else {
				can.drawImage(my.currDrawChessImg, c2d.IX, c2d.JY, my.baseWidth, my.baseWidth);
			}

			function drawColorchess() {
				can.shadowOffsetX = 4;
				can.shadowOffsetY = 4;
				can.shadowBlur = 8;
				can.shadowColor = "rgba(0, 0, 0, 0.5)";
				can.beginPath();
				can.moveTo(c2d.IX + poffset, c2d.JY + poffset);
				can.arc(c2d.IX + poffset, c2d.JY + poffset, my.chessRadius, 0, 2 * Math.PI, false);
				can.closePath();
				can.fill();
			}

			can.restore();
		}

		/**
		 * @param {Object} loc
		 * @return {Object} I 二维横点，J二维纵点，IX 横点起始坐标,JY纵点起始坐标
		 */
		function calc2dPoint(loc) {
			var txp = Math.floor(loc.x / my.baseWidth),
				typ = Math.floor(loc.y / my.baseWidth)
			dxp = txp * my.baseWidth, dyp = typ * my.baseWidth;

			loc.I = txp;
			loc.J = typ;
			loc.IX = dxp;
			loc.JY = dyp;

			return loc;
		}

		function bindEvent() {
			if (!my.eventBinded) {
				self.contextObj.addEventListener("touchstart", function(event) {
					//console.log(event);
					var touchObj = event.touches[0];
					eventHandle({
						s: "touch",
						x: touchObj.clientX - this.offsetLeft,
						y: touchObj.clientY - this.offsetTop
					})
				});
				self.contextObj.addEventListener("click", function(event) {
					//console.log(event);
					eventHandle({
						s: "click",
						x: event.offsetX,
						y: event.offsetY
					})
				});
				my.eventBinded = true;
			}

			function eventHandle(ps) {
				if (!my.gameover) {
					logic(ps);
				}
				event.preventDefault();
				event.stopPropagation();
				return false;
			}

		}

		//bind event
		//self.contextObj.addEventListener("resize", drawChessboard);

	};

	win.gobang = gb;

})(window);