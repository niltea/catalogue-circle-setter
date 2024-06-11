// ラベル組版モード？（カタログ用の見出し等処理をスキップ）
var isLabel = true;
// 2spもスペースごとに出力（1枚にまとめない）
var isSplit2sp = true;
// サークルカットをセットする？(false: カットまわりの処理をスキップ)
var isSetCut = false;
// ページごとのサークル割当数
var circlesInPageCount = 24;
// ヘッダーを挿入する？
var isInsertHeader = false;
// 2spはハイフンではなく改行で繋ぐ？
var isBreakLine2sp = false;

// 開発用サークルデータパス
var listFileDevelop = './_21906_00_test.csv';

// ページタイトル(prefix)
var pageTitlePrefix = 'サークル一覧(';
// ページタイトル(suffix)
var pageTitleSuffix = ')';
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup-';
// 小口indexのprefix名
var thumbIndexPrefix = 'index-';
// ファイル名選択 kana / id / place
var cutFileNameMode = 'id';
// 準備会SPのときのカットファイル名
var jikoSPFileName = '_blank-1sp';
// カットが上がってない場合に入れるカットのprefix
var notUploadedFilePrefix = '_not_uploaded-';

var cutFilePath = null;

// Node.js環境かどうか調べる
var isNode = (typeof process !== "undefined" && typeof require !== "undefined");
var fs = null;
if (isNode) {
  fs = require('fs');
}

var log = function (message) {
  if (isNode) {
    console.log('==========');
    console.log(message);
  } else {
    alert(message);
  }
};
Array.prototype.indexOf = function(value){
  for(var index = 0; index < this.length; index += 1) {
    if(this[index] === value) {
      return index;
    }
  }
  return -1;
}
var zeroPad = function (spaceNumInt) {
  if (spaceNumInt < 10) {
    return '0' + spaceNumInt.toString();
  } else {
    return spaceNumInt.toString();
  }
};

// リストファイルを読み込んで格納する
var readFile = function (listFile) {
  if (isNode) {
    return fs.readFileSync(listFile, 'utf8');
    // JSON.parse();
  } else {
    var fileObj = new File(listFile);
    var canOpenList = fileObj.open("r");

    if (canOpenList === true) {
      var readData = fileObj.read();
      fileObj.close();
      return readData;
    } else {
      log("ファイルが開けませんでした");
      return {error: true};
    }
  }
};

// 引用符を除去する
var stripQuote = function (item) {
  if (!item) {
    return '';
  }
  return item.replace(/^['"]|['"]$/g, ''); // "
};

// CSVのparse
var parseCSV = function (CSVData) {
  // 区切り文字のカンマを=SEP=へ、セル中の改行を=BR=へ変換
  var quotedLastCol = CSVData.replace(/"\n/g, '').replace(/(created_at|\d{10})\n/g, '"$1"\n');
  // 改行コードで分割して各行を配列に格納する
  var CSVSplitInLine = quotedLastCol.split(/\r?\n/);

  // keyをparseしCamelCaseに変更する
  var dataHeader = CSVSplitInLine[0].split(',');
  // key名の変更
  for (var keyIndex = 0; keyIndex < dataHeader.length; keyIndex += 1) {
    var header = stripQuote(dataHeader[keyIndex]);

    var headerMap = {
      id                        : 'circleID',
      'サークル名'                : 'circleName',
      'サークル名（カナ）'         : 'circleNameKana',
      'ペンネーム'                : 'penName',
      'ペンネーム（カナ）'         : 'penNameKana',
      'space_sym'               : 'spaceSym',
      'space_num'               : 'spaceNum',
      'スペース数'                : 'spaceCount',
      '持込部数'                  : 'sellAmount',
      '合体先サークル'             : 'coupleWith',
      '追加サークル通行証'          : 'addPass',
      '追加イス'                  : 'addChair',
      '成人向け頒布物'             : 'isAdult',
      '前回参加時の持込部数（合計）' : 'prevAmount',
      '前回参加時の持込数'        : 'prevAmount',
      '前回参加時の頒布部数（合計）' : 'prevSold',
      '前回参加時の頒布実績数'      : 'prevSold',
      '前回参加時の頒布内容補足'     : 'prevNote',
      '作品傾向に基づく配置エリアの希望': 'area',
      'メインキャラ'              : 'character',
      '中心ライバー'              : 'character',
      'グループ（コラボ・ユニット・番組・デビュー時期）名':'group',
      '配置希望ライバー補足'        : 'characterNote',
      '攻'                      : 'characterSeme',
      '主な頒布物の種類'           : 'sellDetail',
      '主な頒布物の概要'           : 'sellDetail',
      '頒布物概要・配置寄せの希望'  : 'sellDetail',
      'その他補足事項'             : 'note'
    }
    // マップに無い場合はnoneとして終了
    if (!headerMap[header]) {
      dataHeader[keyIndex] = 'none';
      continue;
    }
    dataHeader[keyIndex] = headerMap[header];
  }

  var breakReplaced = [CSVSplitInLine[1]];
  for (var checkBreakIndex = 1; checkBreakIndex < CSVSplitInLine.length; checkBreakIndex += 1) {
    var thePrevLine = CSVSplitInLine[checkBreakIndex - 1];
    var thisLine = CSVSplitInLine[checkBreakIndex];
    if (thePrevLine.slice(-1) !== '"') {
      var lastIndex = breakReplaced.length - 1;
      breakReplaced[lastIndex] += '<BR>' + thisLine;
    } else {
      breakReplaced.push(thisLine);
    }
  }
  var circleLineArr = [];
  for (var i = 0; i < breakReplaced.length; i += 1) {
    var theLine = breakReplaced[i];
    var replacedLine = '';
    var isCellOpen = false;

    for (var J = 0; J < theLine.length; J++) {
      var theChara = theLine.charAt(J);
      if (theChara === "," && !isCellOpen) {
        replacedLine += '=SEP=';
        continue;
      }
      if (theChara === '"') {
        isCellOpen = !isCellOpen;
      }
      replacedLine += theChara;
    }
    circleLineArr.push(replacedLine);
  }

  // 入力データをparseして格納していく
  var circlesDataArr = [];
  for (var circleIndex = 1; circleIndex < circleLineArr.length; circleIndex += 1) {
    // 空行なら何もしない
    if (!circleLineArr[circleIndex].length) {
      continue;
    }

    // サークル情報の入れ物
    var circleData = {};
    // 値を分割
    var values = circleLineArr[circleIndex].split('=SEP=');

    for (var dataKeyIndex = 0; dataKeyIndex < dataHeader.length; dataKeyIndex += 1) {
      if (dataHeader[dataKeyIndex] !== 'none') {
        if (dataHeader[dataKeyIndex] === 'isAdult') {
          circleData[dataHeader[dataKeyIndex]] = (stripQuote(values[dataKeyIndex]) === 'あり');
        } else {
          circleData[dataHeader[dataKeyIndex]] = stripQuote(values[dataKeyIndex]).replace(/<BR>/g, '/');
        }
      }
    }
    circlesDataArr.push(circleData);
  }
  return circlesDataArr;
};

// サークルをソートする
var sortCircles = function (circlesArray) {
  return circlesArray.sort(function(a, b) {
    var num_a = parseInt(a.spaceNum.slice(0,2), 10);
    var num_b = parseInt(b.spaceNum.slice(0,2), 10);
    return num_a - num_b;
  })
};

// prefix一覧を取得
var getPrefixes = function (circles) {
  var circlesCount = circles.length;
  var prefixArr = [];
  for (var circleIndex = 0; circleIndex < circlesCount; circleIndex += 1) {
    var prefix = circles[circleIndex].spaceSym;
    if (prefixArr.indexOf(prefix) < 0) {
      prefixArr.push(prefix);
    }
  }
  return prefixArr;
};

// ページごとにサークルデータを割り当てていく
var splitInPages = function (circles) {
  var spaceSymArr = getPrefixes(circles);
  var spaceSymCount = spaceSymArr.length;
  if (spaceSymCount === 0) {
    log('spaceSymがセットされてないよ、配置入ってる？');
    return;
  }

  // spaceSymごとにサークルを突っ込んでいく
  var circlesToPlaceInPrefix = {};
  var circlesCount = circles.length;
  for (var circleIndex = 0; circleIndex < circlesCount; circleIndex += 1) {
    var circle = circles[circleIndex];
    var spaceSym = circle.spaceSym;
    if (!circlesToPlaceInPrefix[spaceSym]) {
      circlesToPlaceInPrefix[spaceSym] = [];
    }
    circlesToPlaceInPrefix[spaceSym].push(circle);
  }

  // 各プレフィクスごとにソートする
  var sortOrderEnd = spaceSymCount - 1;
  for(var spaceSymIndex = 0; spaceSymIndex <= sortOrderEnd; spaceSymIndex += 1) {
    var spaceSymToSort = spaceSymArr[spaceSymIndex];
    circlesToPlaceInPrefix[spaceSymToSort] = sortCircles(circlesToPlaceInPrefix[spaceSymToSort]);
  }

  // ページ割り当て用変数
  var pages = [];

  // ページ挿入関数
  var addPage = function (firstCircleInPage, lastCircleInPage, page, layoutIndexInPage) {
    // rangeの始端
    var firstCircleNo = parseInt(firstCircleInPage.spaceNum, 10);
    var lastCircleNo = parseInt(lastCircleInPage.spaceNum, 10)
    firstCircleNo = zeroPad(firstCircleNo);
    if (page[layoutIndexInPage - 2] && page[layoutIndexInPage - 2].spaceCount === '2') {
      lastCircleNo += 1;
    }
    lastCircleNo = zeroPad(lastCircleNo);
    pages.push({
      prefix    : firstCircleInPage.spaceSym,
      range     : firstCircleNo + '-' + lastCircleNo,
      circleData: page,
    });
  };

  // ページ割り当て変数：ページごとの割り当て数の長さの配列を作る
  var page = new Array(circlesInPageCount);
  // ページ内の掲載順番（位置）を入れる変数
  var layoutIndex = 0;
  var firstCircleInPage = null;
  var lastCircleInPage = null;
  var prevSpaceNum = null;
  // isJikoSP: 事故スペカウント用変数をリセットする？
  // layoutIndexInPage→レイアウト済みのカウントになってる
  var pushNewPage = function (resetJikoSpCounter, layoutIndexInPage) {
    addPage(firstCircleInPage, lastCircleInPage, page, layoutIndexInPage);
    // 変数のリセット
    page = new Array(circlesInPageCount);
    layoutIndex = 0;
    firstCircleInPage = null;
    if (resetJikoSpCounter) {
      prevSpaceNum = null;
    }
  };
  // prefixごとにページを作成していく
  for (var spaceSymToPlaceIndex = 0; spaceSymToPlaceIndex < spaceSymCount; spaceSymToPlaceIndex += 1) {
    // 現在のspaceSymを設定
    var spaceSymToPlace = spaceSymArr[spaceSymToPlaceIndex];
    // 当該spaceSymのサークル一覧を抽出
    var circlesToPlace = circlesToPlaceInPrefix[spaceSymToPlace];
    // ループ変数
    var circleCount = circlesToPlace.length - 1;

    // サークルをページに割り当てていく
    for (var circleToPlaceIndex = 0; circleToPlaceIndex <= circleCount; circleToPlaceIndex += 1) {
      // 掲載データの取りだし
      var circleData = circlesToPlace[circleToPlaceIndex];
      circleData.removeFlag = false;
      circleData.isJikoSP = false;
      circleData.is2sp = false;
      var spaceNumInt = parseInt(circleData.spaceNum, 10);

      // ヘッダーを入れる設定の時
      if (isInsertHeader === true && circleToPlaceIndex === 0) {
        layoutIndex += 2;
      }

      // 事故スペースの対応
      if (prevSpaceNum !== null) {
        while(prevSpaceNum !== spaceNumInt - 1) {
          prevSpaceNum += 1;
          // 事故SPとしてデータを入れる
          page[layoutIndex] = page[layoutIndex] = {
            circleID: 'JIKO_SPACE',
            circleName: '準備会スペース',
            circleNameKana: '準備会スペース',
            penName: '準備会スペース',
            penNameKana: '準備会スペース',
            spaceSym: spaceSymToPlace,
            spaceNum: zeroPad(prevSpaceNum),
            spaceCount: '1',
            sellAmount: '0',
            note: '準備会スペース',
            removeFlag: false,
            isJikoSP : true,
            is2sp: false,
            isAdult: false,
          };
          layoutIndex += 1;
          // もしあふれるなら改ページ処理
          if (layoutIndex >= circlesInPageCount) {
            pushNewPage(false);
          }
        }
      }

      if (!firstCircleInPage) firstCircleInPage = circleData;
      lastCircleInPage = circleData;
      // ページにサークルデータを追加
      page[layoutIndex] = circleData;

      if (circleData.spaceCount === '2') {
        prevSpaceNum = spaceNumInt + 1;
        page[layoutIndex].is2sp = true;
        if (isSplit2sp) {
          page[layoutIndex].spaceNum = zeroPad(spaceNumInt);
        }
        // 入るべきIndexにnullを入れておく
        page[layoutIndex + 1] = {
          circleID: circleData.circleID,
          circleName: circleData.circleName,
          circleNameKana: circleData.circleNameKana,
          penName: circleData.penName,
          penNameKana: circleData.penNameKana,
          spaceSym: spaceSymToPlace,
          spaceNum: zeroPad(prevSpaceNum),
          spaceCount: '2',
          note: '2sp',
          removeFlag: true,
          isJikoSP : false,
          is2sp : true,
          isAdult: circleData.isAdult,
        };
        // 2spの時はカウントを2つ増やす
        layoutIndex += 2;
      } else {
        // 1sp
        layoutIndex += 1;
        prevSpaceNum = spaceNumInt;
      }

      // あふれるなら改ページ処理
      if (layoutIndex >= circlesInPageCount) {
        pushNewPage(true);
      }
    }
    // サークルループ終端
    // ページの途中でレイアウトが終了していたら改ページする
    if (layoutIndex !== 0) {
      pushNewPage(true, layoutIndex);
    }
    // spaceSymごとの処理が終わった
  }
  // return
  return pages;
};

var getDocumentObject = function (currentPage) {
  var masterPageItems = currentPage.masterPageItems;
  // グループを格納するObject
  var targetObj = {};
  // 小口indexを格納するObject
  targetObj.thumbIndexes = {};
  // ページからcircleブロックグループを取り出す
  for (var index = 0; index < masterPageItems.length; index += 1) {
    var currentItem = masterPageItems[index];
    var key = currentItem.label;
    // そもそもkeyがセットされてなければ処理しない
    if (!key) {
      continue;
    }
    // サークル情報のコンテナではない(spaceSymが無い)場合の処理
    if (key.indexOf(circleBlockPrefix) < 0) {
      // ページタイトルobjectであればpageTitleへ格納
      if (key === 'pageTitle') {
        targetObj.pageTitle = currentItem.override(currentPage);
      }
      // 小口indexのobjectであればthumbIndex配列へ格納
      if (key.indexOf(thumbIndexPrefix) >= 0) {
        targetObj.thumbIndexes[key] = currentItem.override(currentPage);;
      }
      // あとの処理は関係ないので抜ける
      continue;
    }

    // 現在のグループ内のオブジェクトを格納するObjectを作成
    targetObj[key] = {};
    var groupContainer = targetObj[key];
    // グループをオーバーライド
    var targetGroup = currentItem.override(currentPage);
    // Objectに格納
    groupContainer.group = targetGroup;
    // テキストフレームを格納する処理
    var frameLength = targetGroup.textFrames.length;
    for (var frameIndex = 0; frameIndex < frameLength; frameIndex += 1) {
      var frameItem = targetGroup.textFrames[frameIndex];
      var label = frameItem.label;
      // Objectにフレームを格納
      groupContainer[label] = frameItem;
    }
    // カット用フレームを格納する処理
    var rectLength = targetGroup.rectangles.length;
    for (var rectIndex = 0; rectIndex < rectLength; rectIndex += 1) {
      var rectItem = targetGroup.rectangles[rectIndex];
      var label = rectItem.label;
      // Objectにフレームを格納
      groupContainer[label] = rectItem;
    }
  }
  return targetObj;
};

// PSD -> PNG -> JPGの優先度でいずれか存在するファイルパスを返す
// どちらもいなければダミーファイルのパスを返す
var getFilePath = function (fileName, spaceCount) {
  var filePathPSD = cutFilePath + fileName + '.psd';
  var filePathPNG = cutFilePath + fileName + '.png';
  var filePathJPG = cutFilePath + fileName + '.jpg';
  // check PNG
  var PSDFile = (isNode) ? fs.existsSync(filePathPSD) : new File(filePathPSD);
  if (PSDFile === true || PSDFile.exists){
    return filePathPSD;
  }
  // check PNG
  var PNGFile = (isNode) ? fs.existsSync(filePathPNG) : new File(filePathPNG);
  if (PNGFile === true || PNGFile.exists){
    return filePathPNG;
  }
  var JPGFile = (isNode) ? fs.existsSync(filePathJPG) : new File(filePathJPG);
  if (JPGFile === true || JPGFile.exists){
    return filePathJPG;
  }
  if (!spaceCount) {
    return cutFilePath + notUploadedFilePrefix + '1sp.psd';
  }
  return cutFilePath + notUploadedFilePrefix + spaceCount + 'sp.psd';
};

var setData = function (pageObj, pageData) {
  if (isNode) {
    // Nodeシミュレーション用: 仮Objectを入れ込む
    pageObj = {
      pageTitle: {},
      thumbIndexes: {
        'index-A': {remove: function () { log('removed index-A')}},
        'index-B': {remove: function () { log('removed index-B')}}
      }
    }
    // サークルカットObjectの生成
    for (var i = 1; i <= circlesInPageCount; i += 1) {
      var theObj = {
        group: {
          remove: function () {
            delete this.parent.prefix;
            delete this.parent.spaceNum;
            delete this.parent.circleName;
            delete this.parent.penName;
            delete this.parent.circleCut;
            delete this.parent.group;
            delete this.parent.space;
            if (isLabel) {
              delete this.parent.is2sp;
              delete this.parent.isAdult;
              delete this.parent.options;
            }
          }
        },
        prefix: {contents: ''},
        spaceNum: {contents: ''},
        space: {contents: ''},
        circleName: {contents: ''},
        penName: {contents: ''},
        circleCut: {
          // y1, x1, y2, x2
          geometricBounds: [0, 0, 100, 100]
        }
      };
      if (isLabel) {
        theObj.is2sp = {contents: '2スペース'};
        theObj.isAdult = {contents: '成年向'};
        theObj.options = {contents: '追加椅子: xxx脚'};
      }
      theObj.group.parent = theObj;
      pageObj[circleBlockPrefix + ('0' + i).slice(-2)] = theObj;
    }
  }
  // Nodeシミュレーション用ダミーオブジェクト生成：ここまで
  // カタログ組版時の作業
  if (!isLabel) {
    // ページタイトルのセット
    if (pageObj.pageTitle) {
      pageObj.pageTitle.contents =  pageTitlePrefix + pageData.prefix + pageData.range + pageTitleSuffix;
    }
    // 小口indexの不要アイテム削除
    var indexTargetKey = thumbIndexPrefix + pageData.prefix;
    for (var key in pageObj.thumbIndexes) {
      if (key !== indexTargetKey) pageObj.thumbIndexes[key].remove();
    }
  }

  // サークル詳細の入れ込み
  for(var circleIndex = 1; circleIndex <= circlesInPageCount; circleIndex += 1) {
    // サークルデータを入れるObjectをキャッシュ
    var docObj = pageObj[circleBlockPrefix + ('0' + circleIndex).slice(-2)];
    // サークルデータのキャッシュ
    var circle = pageData.circleData[circleIndex - 1];

    // 2spめのとき or 該当するサークルデータが空の時
    if (circle === undefined || circle === null || (circle.removeFlag && !isSplit2sp)) {
      // indexグループの削除
      docObj.group.remove();
      docObj.isToRemoved = true;
      continue;
    }

    // スペース番号
    // prefix
    if (docObj.prefix && circle.spaceSym) {
      docObj.prefix.contents = circle.spaceSym;
    }
    // スペース数字
    if (docObj.spaceNum && circle.spaceNum) {
      var spaceNum = circle.spaceNum;
      // スペース番号を加工する処理
      // 2spは途中で改行する？ など
      if (circle.spaceCount === '2' && isBreakLine2sp) {
        docObj.spaceNum.contents = spaceNum.replace('-', '\n');
      } else {
        docObj.spaceNum.contents = spaceNum;
      }
    }
    // prefixと数字が一緒に入るケース
    if (docObj.space) {
      docObj.space.contents = circle.spaceSym + '-' + circle.spaceNum;
    }

    // サークル名
    if (docObj.circleName && circle.circleName) {
      docObj.circleName.contents = circle.circleName;
    }

    // ペンネーム
    if (docObj.penName && circle.penName) {
      docObj.penName.contents = circle.penName;
    }

    // サークルカットの配置
    if (cutPath && isSetCut) {
      // 2spのときの処理（フレーム幅変更・不要フレーム削除）
      if (circle.spaceCount && circle.spaceCount === '2') {
        // カット幅を倍にする
        var bounds = docObj.circleCut.geometricBounds;
        var cutWidth = bounds[3] - bounds[1];
        docObj.circleCut.geometricBounds = [
          bounds[0],
          bounds[1],
          bounds[2],
          docObj.circleCut.geometricBounds[3] + cutWidth
        ];
      }
      // 画像配置
      var fileName = '';
      switch(cutFileNameMode) {
        case 'kana':
          if (circle.circleNameKana) {
            fileName = circle.circleNameKana;
          }
          break;
        case 'place':
          if (circle.spaceSym　&& circle.spaceNum) {
            fileName = circle.spaceSym + '-' + circle.spaceNum;
          }
          break;
        case 'id':
          if (circle.circleID) {
            fileName = circle.circleID;
          }
          break;
      }
      // 事故スペのときのカット名をセット
      if (circle.isJikoSP) {
        fileName = jikoSPFileName;
      }
      var cutPath = getFilePath(fileName, circle.spaceCount);
      if (isNode) {
        docObj.circleCut.filePath = cutPath;
        continue;
      }
      if (cutPath) {
        docObj.circleCut.place(File(cutPath));
        docObj.circleCut.fit(EmptyFrameFittingOptions.CONTENT_TO_FRAME);
      }
    }

    // ラベル用処理
    if (!isLabel) {
      continue;
    }
    if (docObj.is2sp && !circle.is2sp) {
      docObj.is2sp.contents = '';
    }
    if (docObj.isAdult && !circle.isAdult) {
      docObj.isAdult.contents = '';
    }
    if (docObj.options) {
      if (circle.addChair) {
        docObj.options.contents = '追加椅子 ' + circle.addChair;
      } else {
        docObj.options.contents = '';
      }
    }
    // サークルループ終端
  }

  // Nodeデバッグ用
  if (isNode) {
    log(pageObj)
  }
};

// データ流し込み関数
var createPages = function (pageDataArr) {
  // 流し込むデータのページ数
  var pagesToSetCount = pageDataArr.length;
  if (isNode) {
    for (var pageIndexSimulate = 0; pageIndexSimulate < pagesToSetCount; pageIndexSimulate += 1) {
      // 作業するページを取得
      setData(null, pageDataArr[pageIndexSimulate]);
    }
    return;
  }
  // InDesignの変数
  // 現在開いているドキュメントを指定
  var docObj = app.activeDocument;
  // 全ページ数を取得
  var initialDocPagesCount = docObj.pages.length - 1;
  // マスターページを取得
  var master = app.activeDocument.masterSpreads[1];
  for (var pageIndex = 0; pageIndex < pagesToSetCount; pageIndex += 1) {
    // 初期ページ数を上回ったらマスターから新規ページ作成
    if (pageIndex > initialDocPagesCount) {
      docObj.pages.add(LocationOptions.AT_END, master);
    }

    // 作業するページを取得
    var pageObj = getDocumentObject(docObj.pages[pageIndex]);
    setData(pageObj, pageDataArr[pageIndex]);
  }
};

var main = function () {
  // InDesign環境ではファイルダイアログを開いてリストファイルパスよみこみ
  var listFile = null;
  if (isNode) {
    listFile = listFileDevelop;
  } else {
    // InDesign
    function listCallback (F) {
      var re = /\.(json|csv)$/i;
      return (F instanceof Folder || re.test(F.fsName));
    }
    var listFile = File.openDialog('サークルデータを選択', listCallback, false);
    if (listFile === null) {
      log('リストファイルが選択されていません');
      return;
    }
  }

  // サークルカット格納パスはリストと同じ場所にセット
  cutFilePath = listFile.toString().match(/^.*\//)[0];

  // サークルデータよみこみ
  var listData = readFile(listFile);
  if (listData === undefined || listData.error) {
    log('データ読み込みに失敗したかも')
    return;
  }

  // サークルデータ読み込み後処理
  var listFileExt = listFile.toString().match(/[^.]+$/).toString().toLowerCase();
  var circles = [];
  if (listFileExt === 'json') {
    // circles = JSON.parse(listData);
  } else {
    circles = parseCSV(listData);
  }

  // ページにサークルを配置していく
  var pages = splitInPages(circles);
  if (!pages) {
    return;
  }
  log(circles.length + 'サークル読み込みました\n掲載ページ数は' + pages.length + 'ページです');
  createPages(pages);
};

// run main script
if (isNode) {
  main();
  // app.doScript(main, ScriptLanguage.javascript, [], UndoModes.fastEntireScript);
}
