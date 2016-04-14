//  ========== 
//  =name:gobang 游戏 
//  =anthor:刘敬
//  =last modify date:2016-04-13
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
			backColorORImg: "default",
			playerBIsComputer: false
		};

		self.operate;

		//合并属性
		for (var a in option) {
			//console.log(opt[a]);
			self.Opt[a] = option[a];
		};

		//私有变量
		var my = {};
		my.enableCalcWeightNum = false; //显示AI分数
		my.gameover = false;
		//棋盘相关
		my.baseWidth = 30;
		my.lastFocusPoint = {}; //鼠标最后移动到的坐标点，计算后的
		my.cw = self.contextObj.offsetWidth; //棋盘宽
		my.ch = self.contextObj.offsetHeight; //高
		my.xlen = Math.ceil(my.cw / my.baseWidth); //行数
		my.ylen = Math.ceil(my.ch / my.baseWidth); //列
		my.chessRadius = 14; //棋子半径
		my.playerBIsComputer = false; //棋手B是否是电脑
		my.ComputerThinking = false; //电脑是否在下棋
		my.goBackC2dIsComputer = false; //最后下棋是否为电脑

		my.switcher = 1; //由谁下棋了 1-a 2-b or computer
		my.winer = -1; //赢家，值参考my.switcher
		my.playScoreA = 0;
		my.playScoreB = 0;
		//x，y 正方形数量（20*20）
		my.rectNum = my.xlen;
		//存储已下的点
		my.rectMap = [];
		my.NO_CHESS = -1; //没有棋子标识
		my.goBackC2d = {}; //最后下的数组转换坐标
		my.downChessmanStackC2d = []; // 记录已下棋子的顺序和位置，堆栈

		my.focusFlashInterval = null; //焦点闪烁线程
		my.focusChangeColors = ["red", "fuchsia", "#ADFF2F", "yellow", "purple", "blue"];
		my.eventBinded = false;
		my.currChessBackImg = null;
		my.currChessAImg = null;
		my.currChessBImg = null;
		my.currDrawChessImg = null;
		my.ChessDownNum = 0; //2个玩家 下棋总数

		/**
		 * 开始游戏
		 */
		self.start = function() {
			init();
			my.gameover = false;

			if (self.info && typeof self.info == "function") {
				self.info(self.Opt);
			}
		};

		/**
		 * 重新开始游戏
		 */
		self.restart = function() {

			drawRect(my.goBackC2d);
			clearInterval(my.focusFlashInterval);

			//重置二维地图
			for (var i = 0; i < my.rectNum; i++) {
				for (var j = 0; j < my.rectNum; j++) {
					my.rectMap[i][j] = -1;
				}
			}

			self.Opt._map = my.rectMap;

			//重新初始化一些参数
			drawChessboard();
			my.switcher = 1; //由谁下棋了 1-a 2-b 3-computer
			my.winer = -1; //赢家，值参考my.switcher
			my.gameover = false;
			my.ChessDownNum = 0;
			my.goBackC2d = {};
			my.lastFocusPoint = {};
			my.downChessmanStackC2d = [];

			self.operate(null, {
				player: 2,
				winer: my.winer,
				canBackTimes: 0
			});
		};

		/**
		 * 悔棋一步 ,清棋子，并返回上一次参数
		 */
		self.back = function() {

			if (!my.gameover && my.downChessmanStackC2d.length > 0) {

				var backtime = 1;

				if (my.playerBIsComputer && my.switcher == 1) {
					backtime = 2;
				}

				for (var i = 0; i < backtime; i++) {
					my.goBackC2d = my.downChessmanStackC2d.pop();

					if (my.goBackC2d && my.goBackC2d.I) {
						clearChessman();
						var lastRecord = my.goBackC2d;
						//参数返回
						my.rectMap[lastRecord.I][lastRecord.J] = -1;
						my.winer = -1;
						my.switcher = lastRecord.player;

						if (!my.playerBIsComputer) {
							if (lastRecord.player == 1) {
								my.player = 2;
							} else {
								my.player = 1;
							}
						}

						self.operate(null, {
							player: my.player,
							winer: my.winer,
							canBackTimes: my.downChessmanStackC2d.length
						});

						my.goBackC2d = null;
					}
				}

			}
		}

		/**
		 * 初始化一些数据
		 */
		function init() {

			AI.init();
			my.playerBIsComputer = self.Opt.playerBIsComputer;
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
		function logic(loc, iscomputer) {
			my.ChessDownNum++;
			//计算过的参数
			var c2d = new Object();
			if (!iscomputer) {
				c2d = calc2dPoint(loc);
			} else {
				//电脑给出的已经是实际坐标了，重新生成一下x,y坐标
				c2d.IX = loc.I * my.baseWidth;
				c2d.JY = loc.J * my.baseWidth;
				c2d.I = loc.I;
				c2d.J = loc.J;
			}

			var va = my.rectMap[c2d.I][c2d.J];

			if (va < 0) {
				drawRect(my.goBackC2d);

				//设置二维棋子数据
				my.rectMap[c2d.I][c2d.J] = my.switcher;
				c2d.player = my.switcher;
				my.goBackC2d = c2d;
				my.downChessmanStackC2d.push(c2d);

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
					} else {
						my.playScoreB++;
					}
					c2d.playScoreA = my.playScoreA;
					c2d.playScoreB = my.playScoreB;

					drawRect(my.goBackC2d);
					clearInterval(my.focusFlashInterval);
				}
				if (self.operate && typeof self.operate == "function") {
					c2d.canBackTimes = my.downChessmanStackC2d.length;
					self.operate(self.Opt, c2d);
				}
			}

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

			var countArray = [];

			//左-1
			for (var i = c2d.I; i >= 0; i--) {
				temp = my.rectMap[i][c2d.J];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				hcount++;
				countArray.push({
					I: i,
					J: c2d.J
				});
			}
			//右-1
			for (var i = c2d.I + 1; i < my.rectMap.length; i++) {
				temp = my.rectMap[i][c2d.J];
				if (temp < 0 || temp !== c2d.player) {
					break;
				}
				hcount++;
				countArray.push({
					I: i,
					J: c2d.J
				});
			}

			if (countArray.length < 5) {
				countArray = [];
				//上-2
				for (var j = c2d.J; j >= 0; j--) {
					temp = my.rectMap[c2d.I][j];
					if (temp < 0 || temp !== c2d.player) {
						break;
					}
					vcount++;

					countArray.push({
						I: c2d.I,
						J: j
					});
				}
				//下-2
				for (var j = c2d.J + 1; j < my.rectMap[c2d.I].length; j++) {
					temp = my.rectMap[c2d.I][j];
					if (temp < 0 || temp !== c2d.player) {
						break;
					}
					vcount++;
					countArray.push({
						I: c2d.I,
						J: j
					});
				}
			}

			if (countArray.length < 5) {
				countArray = [];
				//左上
				for (var i = c2d.I, j = c2d.J; i >= 0, j >= 0; i--, j--) {
					if (i < 0 || j < 0) break;
					temp = my.rectMap[i][j];
					if (temp < 0 || temp !== c2d.player) {
						break;
					}
					lbhcount++;
					countArray.push({
						I: i,
						J: j
					});
				}
				//右下
				if (c2d.I < my.rectMap.length - 1 && c2d.I < my.rectMap[0].length - 1) {
					for (var i = c2d.I + 1, j = c2d.J + 1; i < my.rectMap.length, j < my.rectMap[0].length; i++, j++) {
						if (i >= my.rectMap.length || j >= my.rectMap.length) break;
						temp = my.rectMap[i][j];
						if (temp < 0 || temp !== c2d.player) {
							break;
						}
						lbhcount++;
						countArray.push({
							I: i,
							J: j
						});
					}
				}
			}
			if (countArray.length < 5) {
				countArray = [];
				//右上
				for (var i = c2d.I, j = c2d.J; i < my.rectMap.length, j >= 0; i++, j--) {
					if (i >= my.rectMap.length || j < 0) break;
					temp = my.rectMap[i][j];
					if (temp < 0 || temp !== c2d.player) {
						break;
					}
					rbhcount++;
					countArray.push({
						I: i,
						J: j
					});
				}
				//左下
				if (c2d.I >= 1 && c2d.J < my.rectMap[0].length - 1) {
					for (var i = c2d.I - 1, j = c2d.J + 1; i > 0, j < my.rectMap[0].length; i--, j++) {
						if (j >= my.rectMap.length || i < 0) break;
						temp = my.rectMap[i][j];
						if (temp < 0 || temp !== c2d.player) {
							break;
						}
						rbhcount++;
						countArray.push({
							I: i,
							J: j
						});
					}
				}
			}

			if (hcount >= 5 || vcount >= 5 || lbhcount >= 5 || rbhcount >= 5) {
				my.winer = c2d.player;
				my.gameover = true;

				joinWinLine(countArray);

				return true;
			}

			return false;
		}

		/**
		 * 连接赢家棋子线
		 * @param {Object} points
		 */
		function joinWinLine(points) {

			points.sort(function(left, right) {
				return (left.I + left.J) > (right.I + right.J);
			});

			var startP = points.shift();
			var endP = points.pop();
			var poffset = my.baseWidth / 2;
			can.strokeStyle = "#FF0000";
			can.lineWidth = 2;
			can.beginPath();
			var spx = startP.I * my.baseWidth + poffset,
				spy = startP.J * my.baseWidth + poffset;
			can.arc(spx, spy, my.baseWidth / 4, 0, 2 * Math.PI, false);
			can.moveTo(spx, spy);
			var epx = endP.I * my.baseWidth + poffset,
				epy = endP.J * my.baseWidth + poffset;
			can.lineTo(epx, epy);
			can.moveTo(epx + my.baseWidth / 4, epy);
			can.arc(epx, epy, my.baseWidth / 4, 0, 2 * Math.PI, false);

			can.closePath();
			can.stroke();

		}

		/**
		 * 画棋盘
		 */
		function drawChessboard() {
			can.save();

			can.clearRect(0, 0, my.cw, my.ch);

			if (self.Opt.backColorORImg === "default") {
				self.contextObj.style.backgroundColor = "#ECC4A1";
				drawline();
			} else {
				if (my.currChessBackImg == null) {
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
				poffset = (my.baseWidth - my.chessRadius * 2) / 2;
				can.drawImage(my.currDrawChessImg, c2d.IX + poffset, c2d.JY + poffset, my.chessRadius * 2, my.chessRadius * 2);
			}

			function drawColorchess() {
				//				can.shadowOffsetX = 1;
				//				can.shadowOffsetY = 1;
				//				can.shadowBlur = 1;
				can.shadowColor = "rgba(0, 0, 0, 0.5)";
				can.beginPath();
				can.moveTo(c2d.IX + poffset, c2d.JY + poffset);
				can.arc(c2d.IX + poffset, c2d.JY + poffset, my.chessRadius - 1, 0, 2 * Math.PI, false);
				can.closePath();
				can.fill();
			}
			//高亮 红色
			drawRect(my.goBackC2d, my.focusChangeColors[0]);
			can.restore();

			flashFocusChessman();
		}

		function drawRect(lastRecord, defColor) {
			if (lastRecord) {
				can.strokeStyle = defColor ? defColor : self.Opt.lineColor;
				can.lineWidth = 2;
				can.strokeRect(lastRecord.IX, lastRecord.JY, my.baseWidth, my.baseWidth);
			}
		}

		/**
		 * 闪烁最后下棋点
		 */
		function flashFocusChessman() {

			if (my.focusFlashInterval) {
				clearInterval(my.focusFlashInterval);
			}
			var i = 0;
			my.focusFlashInterval = setInterval(function() {
				if (i > 0 && i > my.focusChangeColors.length - 1) {
					i = 0;
				}
				//console.log(i);
				drawRect(my.goBackC2d, my.focusChangeColors[i]);
				i++;
			}, 300);
		}

		/**
		 * 清棋子
		 * @param {Object} c2d
		 */
		function clearChessman() {

			var lastRecord = my.goBackC2d;
			can.strokeStyle = self.Opt.lineColor;
			can.lineWidth = 2;
			can.clearRect(lastRecord.IX, lastRecord.JY, my.baseWidth, my.baseWidth);
			can.strokeRect(lastRecord.IX, lastRecord.JY, my.baseWidth, my.baseWidth);

		}

		/**
		 * 坐标换算
		 * @param {Object} loc
		 * @return {Object} I 二维数组横点()，J二维数组纵点，IX 横点起始坐标,JY纵点起始坐标,player 最后下棋玩, winer 赢家
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

		my.isChangeDraw = true;

		/**
		 * 位置移动光标
		 * @param {Object} loc
		 */
		function moveFocus(loc) {
			var c2d = calc2dPoint(loc);
			//console.log(c2d);

			if (my.rectMap[c2d.I][c2d.J] > 0 ||
				(my.goBackC2d && my.goBackC2d.I == c2d.I && my.goBackC2d.J == c2d.J)
			) {
				return;
			}

			if (my.goBackC2d && my.lastFocusPoint && my.goBackC2d.I && my.lastFocusPoint.I && my.goBackC2d.I == my.lastFocusPoint.I && my.goBackC2d.J == my.lastFocusPoint.J) {
				my.lastFocusPoint = c2d;
				return;
			}

			if (my.lastFocusPoint.I != c2d.I || my.lastFocusPoint.J != c2d.J) {
				drawRect(my.lastFocusPoint);
				my.lastFocusPoint = c2d;
				my.isChangeDraw = true;
			}
			if (my.isChangeDraw) {
				drawRect(c2d, "red");
				my.isChangeDraw = false;
			}
		}

		/**
		 * 绑定事件
		 */
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
					//console.log("click event");
					eventHandle({
						s: "click",
						x: event.offsetX,
						y: event.offsetY
					})
				});

				self.contextObj.addEventListener("mousemove", function(event) {
					//console.log("mousemove event");
					moveFocus({
						x: event.offsetX,
						y: event.offsetY
					});

				});

				my.eventBinded = true;
			}

			function eventHandle(ps) {
				if (!my.gameover && !my.ComputerThinking) {
					logic(ps);

					if (my.playerBIsComputer && my.switcher == 2) {
						my.ComputerThinking = true;
						var pp = AI.analysis(my.goBackC2d.I, my.goBackC2d.J);
						logic({
							I: pp.x,
							J: pp.y
						}, true);
						my.ComputerThinking = false;
					}
				}
				event.preventDefault();
				event.stopPropagation();
				return false;
			}

		}

		var AI = AI || {};
		//代表每个方向
		AI.direction = {
			TOP: 1,
			BOTTOM: 2,
			LEFT: 3,
			RIGHT: 4,
			LEFT_TOP: 5,
			LEFT_BOTTOM: 6,
			RIGHT_TOP: 7,
			RIGHT_BOTTOM: 8
		};

		var BOARD_SIZE = -1; //棋盘格子数量

		//初始化
		AI.init = function() {
			BOARD_SIZE = my.rectNum;
		};

		/**
		 * AI棋型分析 
		 */
		AI.analysis = function(x, y) {
			//如果为第一步则，在玩家棋周围一格随机下棋，保证每一局棋第一步都不一样
			if (my.ChessDownNum == 1) {
				return this.getFirstPoint(x, y);
			}
			var maxX = 0,
				maxY = 0,
				maxWeight = 0,
				i, j, tem;

			for (i = BOARD_SIZE - 1; i >= 0; i--) {
				for (j = BOARD_SIZE - 1; j >= 0; j--) {
					if (my.rectMap[i][j] !== -1) {
						continue;
					}
					tem = this.computerWeight(i, j, 2);
					if (tem > maxWeight) {
						maxWeight = tem;
						maxX = i;
						maxY = j;

					}
					if (my.enableCalcWeightNum) {
						can.clearRect(i * 30 + 2, j * 30 + 2, 24, 24);
						can.fillText(maxWeight, i * 30 + 5, j * 30 + 15, 30);
					}
				}
			}
			return new Point(maxX, maxY);
		};
		//下子到i，j X方向 结果: 多少连子 两边是否截断
		AI.putDirectX = function(i, j, chessColor) {
			var m, n,
				nums = 1,
				side1 = false, //两边是否被截断
				side2 = false;
			for (m = j - 1; m >= 0; m--) {
				if (my.rectMap[i][m] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[i][m] === my.NO_CHESS) {
						side1 = true; //如果为空子，则没有截断
					}
					break;
				}
			}
			for (m = j + 1; m < BOARD_SIZE; m++) {
				if (my.rectMap[i][m] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[i][m] === my.NO_CHESS) {
						side2 = true;
					}
					break;
				}
			}
			return {
				"nums": nums,
				"side1": side1,
				"side2": side2
			};
		};
		//下子到i，j Y方向 结果
		AI.putDirectY = function(i, j, chessColor) {
			var m, n,
				nums = 1,
				side1 = false,
				side2 = false;
			for (m = i - 1; m >= 0; m--) {
				if (my.rectMap[m][j] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[m][j] === my.NO_CHESS) {
						side1 = true;
					}
					break;
				}
			}
			for (m = i + 1; m < BOARD_SIZE; m++) {
				if (my.rectMap[m][j] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[m][j] === my.NO_CHESS) {
						side2 = true;
					}
					break;
				}
			}
			return {
				"nums": nums,
				"side1": side1,
				"side2": side2
			};
		};
		//下子到i，j XY方向 结果
		AI.putDirectXY = function(i, j, chessColor) {
			var m, n,
				nums = 1,
				side1 = false,
				side2 = false;
			for (m = i - 1, n = j - 1; m >= 0 && n >= 0; m--, n--) {
				if (my.rectMap[m][n] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[m][n] === my.NO_CHESS) {
						side1 = true;
					}
					break;
				}
			}
			for (m = i + 1, n = j + 1; m < BOARD_SIZE && n < BOARD_SIZE; m++, n++) {
				if (my.rectMap[m][n] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[m][n] === my.NO_CHESS) {
						side2 = true;
					}
					break;
				}
			}
			return {
				"nums": nums,
				"side1": side1,
				"side2": side2
			};
		};
		AI.putDirectYX = function(i, j, chessColor) {
			var m, n,
				nums = 1,
				side1 = false,
				side2 = false;
			for (m = i - 1, n = j + 1; m >= 0 && n < BOARD_SIZE; m--, n++) {
				if (my.rectMap[m][n] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[m][n] === my.NO_CHESS) {
						side1 = true;
					}
					break;
				}
			}
			for (m = i + 1, n = j - 1; m < BOARD_SIZE && n >= 0; m++, n--) {
				if (my.rectMap[m][n] === chessColor) {
					nums++;
				} else {
					if (my.rectMap[m][n] === my.NO_CHESS) {
						side2 = true;
					}
					break;
				}
			}
			return {
				"nums": nums,
				"side1": side1,
				"side2": side2
			};
		};

		/**
		 * 计算AI下棋权重 
		 * chessColor 玩家1为玩家2为AI
		 */
		AI.computerWeight = function(i, j, chessColor) {
			//基于棋盘位置权重（越靠近棋盘中心权重越大）
			var weight = 19 - (Math.abs(i - 19 / 2) + Math.abs(j - 19 / 2)),
				pointInfo = {}; //某点下子后连子信息

			//x方向
			pointInfo = this.putDirectX(i, j, chessColor);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, true); //AI下子权重
			pointInfo = this.putDirectX(i, j, chessColor - 1);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, false); //player下子权重
			//y方向
			pointInfo = this.putDirectY(i, j, chessColor);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, true); //AI下子权重
			pointInfo = this.putDirectY(i, j, chessColor - 1);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, false); //player下子权重
			//左斜方向
			pointInfo = this.putDirectXY(i, j, chessColor);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, true); //AI下子权重
			pointInfo = this.putDirectXY(i, j, chessColor - 1);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, false); //player下子权重
			//右斜方向
			pointInfo = this.putDirectYX(i, j, chessColor);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, true); //AI下子权重
			pointInfo = this.putDirectYX(i, j, chessColor - 1);
			weight += this.weightStatus(pointInfo.nums, pointInfo.side1, pointInfo.side2, false); //player下子权重
			return weight;
		};
		//权重方案   活：两边为空可下子，死：一边为空
		//其实还有很多种方案，这种是最简单的
		AI.weightStatus = function(nums, side1, side2, isAI) {
			var weight = 0;
			switch (nums) {
				case 1:
					if (side1 && side2) {
						weight = isAI ? 15 : 10; //一
					}
					break;
				case 2:
					if (side1 && side2) {
						weight = isAI ? 100 : 50; //活二
					} else if (side1 || side2) {
						weight = isAI ? 10 : 5; //死二
					}
					break;
				case 3:
					if (side1 && side2) {
						weight = isAI ? 500 : 200; //活三
					} else if (side1 || side2) {
						weight = isAI ? 30 : 20; //死三
					}
					break;
				case 4:
					if (side1 && side2) {
						weight = isAI ? 5000 : 2000; //活四
					} else if (side1 || side2) {
						weight = isAI ? 400 : 100; //死四
					}
					break;
				case 5:
					weight = isAI ? 100000 : 10000; //五
					break;
				default:
					weight = isAI ? 500000 : 250000;
					break;
			}
			return weight;
		};

		//AI第一步棋
		//参数x,y为玩家第一步棋的坐标
		AI.getFirstPoint = function(x, y) {
			var point = new Point(x, y);
			if (x < 3 || x > BOARD_SIZE - 3 || y < 3 || y > BOARD_SIZE - 3) {
				point.x = BOARD_SIZE >> 1;
				point.y = BOARD_SIZE >> 1;
			} else {

				var direction = Math.ceil(Math.random() * 8);
				if (direction <= 0 || direction > 8) {
					direction = 2;
				}
				switch (direction) {
					case this.direction.TOP:
						point.y = y - 1;
						break;
					case this.direction.BOTTOM:
						point.y = y + 1;
						break;
					case this.direction.LEFT:
						point.x = x - 1;
						break;
					case this.direction.RIGHT:
						point.x = x + 1;
						break;
					case this.direction.LEFT_TOP:
						point.x = x - 1;
						point.y = y - 1;
						break;
					case this.direction.LEFT_BOTTOM:
						point.x = x - 1;
						point.y = y + 1;
						break;
					case this.direction.RIGHT_TOP:
						point.x = x + 1;
						point.y = y - 1;
						break;
					case this.direction.RIGHT_BOTTOM:
						point.x = x + 1;
						point.y = y + 1;
						break;
					default:
						point.x = x - 1;
						point.y = y - 1;
						break;
				}
			}
			return point;
		};

		function Point(x, y) {
			var self = this;
			self.x = x;
			self.y = y;
		};

	};

	win.gobang = gb;

})(window);