// 開発用サークルデータ
var listFileDevelop = '/Users/niltea/Library/Preferences/Adobe InDesign/Version 19.0-J/ja_JP/Scripts/Scripts Panel/test.csv';
// サークルカット格納パス
var cutFilePathDevelop = '/Users/niltea/Desktop/cut/';

// リストのファイルモード json / csv
var listMode = 'csv';
// ファイル名選択 kana / id / place
var cutFileNameMode = 'id';

// ページごとのサークル割当数
var circlesInPage = 7;
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup-';

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

// 引用符を除去する
var stripQuote = function (item) {
  if (!item) {
    return '';
  }
  return item.replace(/^['"]|['"]$/g, ''); // "
}
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
  for (var checkBreakIndex = 2; checkBreakIndex < CSVSplitInLine.length; checkBreakIndex += 1) {
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
          circleData[dataHeader[dataKeyIndex]] = (values[dataKeyIndex] === 'あり');
        } else {
          circleData[dataHeader[dataKeyIndex]] = stripQuote(values[dataKeyIndex]).replace(/<BR>/g, '/');
        }
      }
    }
    circlesDataArr.push(circleData);
  }
  return circlesDataArr;
};

/* JSONファイルを読み込んで格納する */
var readFile = function () {
  var fileObj = new File(listFile);
  var openFlag = fileObj.open('r');

  if (openFlag === true) {
    var readData = fileObj.read();
    fileObj.close();
    return readData;
  } else {
    log('ファイルが開けませんでした');
    return null;
  }
};
/* Node.js版 JSONファイルを読み込んで格納する */
var readFileNode = function () {
  return new Promise(function (resolve, reject) {
    fs.readFile(listFileDevelop, 'utf8', function (err, readData) {
      if (err) {
        resolve({error: true});
        return;
      }
      resolve(readData);
    });
  });
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
var splitInPages = function (parsedEventData) {
  // var circlesCount = parsedEventData.circlesCount;
  var circles = parsedEventData.circles;

  // ページ割り当て用変数
  var pages = [];
  var pagesCount = 0;

  // ページ挿入関数
  var addPage = function (firstCircleInPage, lastCircleInPage, page) {
    var count = 0;
    for(i = 0; i < circlesInPage; i += 1) {
      if (page[i]) {
        count += 1;
      }
    }
    pages.push({
      count     : count,
      circleData: page,
    });
  };

  // ページ割り当て変数
  var page = new Array(circlesInPage);
  // ページ内の掲載順番（位置）を入れる変数
  var layoutIndex = 0;
  var firstCircleInPage = null;
  var lastCircleInPage = null;
  var pushNewPage = function () {
    addPage(firstCircleInPage, lastCircleInPage, page);
    // 変数のリセット
    page = new Array(circlesInPage);
    layoutIndex = 0;
    firstCircleInPage = null;
  };
  // ループ変数
  var circleCount = circles.length - 1;

  // サークルをページに割り当てていく
  for (var circleIndex = 0; circleIndex <= circleCount; circleIndex += 1) {
    // 掲載データの取りだし
    var circleData = circles[circleIndex];

    if (!firstCircleInPage) firstCircleInPage = circleData;
    lastCircleInPage = circleData;
    // ページにサークルデータを追加
    page[layoutIndex] = circleData;

    layoutIndex += 1;
    // あふれるなら改ページ処理
    if (layoutIndex >= circlesInPage) {
      pushNewPage();
    }
  }
  // サークルループ終端
  // 余りページがあれば追加
  if (layoutIndex !== 0) {
    pushNewPage();
  }
  // return
  return pages;
};

var getDocumentObject = function (currentPage) {
  var masterPageItems = currentPage.masterPageItems;
  // グループを格納するObject
  var targetObj = {};
  // ページからcircleブロックグループを取り出す
  for (var index = 0; index < masterPageItems.length; index += 1) {
    var currentItem = masterPageItems[index];
    var key = currentItem.label;
    // サークルitemグループじゃなかったときは処理を抜ける
    if (key.indexOf(circleBlockPrefix) < 0) {
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
// どちらもいなければnullを返す
var getFilePath = function (fileName) {
  var filePathPSD = cutFilePath + fileName + '.psd';
  var filePathPNG = cutFilePath + fileName + '.png';
  var filePathJPG = cutFilePath + fileName + '.jpg';
  // check PNG
  var PSDfile = new File(filePathPSD);
  if (PSDfile.exists){
    return filePathPSD;
  }
  // check PNG
  var PNGfile = new File(filePathPNG);
  if (PNGfile.exists){
    return filePathPNG;
  }
  var JPGfile = new File(filePathJPG);
  if (JPGfile.exists){
    return filePathJPG;
  }
  return null;
};

var setData = function (pageObj, pageData) {
  // 配置済サークル数カウンタ
  var placedCount = 0;
  // サークル詳細の入れ込み
  for(var circleIndex = 1; circleIndex <= circlesInPage; circleIndex += 1) {
    var docObj = pageObj[circleBlockPrefix + ('0' + circleIndex).slice(-2)];
    // データ数以上のサークルを配置し終えた場合、残りのフレームを削除する
    placedCount += 1;
    if (placedCount > pageData.count) {
      docObj.group.remove();
      continue;
    }

    // サークルデータのキャッシュ
    var circle = pageData.circleData[circleIndex - 1];

    // サークル名
    if (docObj.circleName && circle.circleName) {
      docObj.circleName.contents = circle.circleName;
    }
    // サークル名
    if (docObj.circleNameKana && circle.circleNameKana) {
      docObj.circleNameKana.contents = circle.circleNameKana;
    }
    // ペンネーム
    if (docObj.penName && circle.penName) {
      docObj.penName.contents = circle.penName;
    }
    // スペース数
    if (docObj.spaceCount && circle.spaceCount) {
      docObj.spaceCount.contents = circle.spaceCount;
    }
    // 持込部数
    if (docObj.sellAmount && circle.sellAmount) {
      docObj.sellAmount.contents = circle.sellAmount;
    }
    // 合体先サークル
    if (docObj.coupleWith) {
      if (circle.coupleWith) {
        docObj.coupleWith.contents = circle.coupleWith;
      } else {
        docObj.coupleWith.contents = '---';
      }
    }
    // 成人向け頒布物
    if (docObj.isAdult) {
      docObj.isAdult.contents = (circle.isAdult) ? 'あり' : '';
    }
    // 前回参加時の持込数
    if (docObj.prevBring) {
      docObj.prevBring.contents = (circle.prevAmount) ? circle.prevAmount : '';
    }
    // 前回参加時の頒布部数
    if (docObj.prevSell) {
      docObj.prevSell.contents = (circle.prevSold) ? circle.prevSold : '';
    }
    // 前回参加時の頒布内容補足
    if (docObj.prevInfo) {
      docObj.prevInfo.contents = (circle.prevNote) ? circle.prevNote : '';
    }
    // 配置エリア
    if (docObj.area) {
      if (circle.area === '女性向（CP）') {
        docObj.area.contents = '女性向CP';
      } else if (circle.area === '特に指定しない') {
        docObj.area.contents = '指定なし';
      } else {
        docObj.area.contents = circle.area;
      }
    }
    // メインキャラ
    if (docObj.character) {
      docObj.character.contents = (circle.character) ? circle.character : '';
    }
    // グループ
    if (docObj.group) {
      docObj.group.contents = (circle.group) ? circle.group : '';
    }
    // 配置希望ライバー補足
    if (docObj.characterNote) {
      docObj.characterNote.contents = (circle.characterNote) ? circle.characterNote : '';
    }
    // 攻
    if (docObj.characterSeme) {
      docObj.characterSeme.contents = (circle.characterSeme) ? circle.characterSeme : '';
    }
    // 頒布物概要
    if (docObj.sellDetail) {
      docObj.sellDetail.contents = (circle.sellDetail) ? circle.sellDetail : '';
    }
    // その他補足事項
    if (docObj.note) {
      docObj.note.contents = (circle.note) ? circle.note : '';
    }
    // spaceCount
    if (docObj.spaceCount && circle.spaceCount) {
      docObj.spaceCount.contents = circle.spaceCount + 'SP';
    }

    // 画像配置
    var fileName = '';
    switch(cutFileNameMode) {
      case 'kana':
        fileName = circle.circleNameKana;
        break;
      case 'place':
        fileName = circle.spaceNoHyp;
        break;
      case 'id':
        fileName = circle.circleID;
        break;
    }
    var cutPath = getFilePath(fileName);

    // サークルカットの配置・カット枠へのフィット
    if (cutPath) {
        docObj['cut'].place(File(cutPath));
        docObj['cut'].fit(EmptyFrameFittingOptions.PROPORTIONALLY);
    }
  }
};

// データ流し込み関数
var createPages = function (pageDataArr) {
  if (isNode) {
    log('node環境なので流し込みはスキップしますよ');
    return;
  }
  // InDesignの変数
  // 現在開いているドキュメントを指定
  var docObj = app.activeDocument;
  // 全ページ数を取得
  var initialDocPagesCount = docObj.pages.length - 1;
  // 流し込むデータのページ数
  var pagesToSetCount = pageDataArr.length;
  // マスターページを取得
  var master = app.activeDocument.masterSpreads[0];
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

var main = function (listData) {
  // if (listMode === 'json') {
  //   main(JSON.parse(readData));
  // }
  var circles = parseCSV(listData);

  // サークル数をアラート表示
  var circlesCount = circles.length;

  // var prefixArr = getPrefixes(circles);
  var pages = splitInPages({
    circlesCount: circlesCount,
    circles: circles
  });
  if (!pages) {
    return;
  }
  log(circlesCount + 'サークル\n掲載ページ数は' + pages.length + 'ページです');
  createPages(pages);
};

// run main script
if (isNode) {
  readFileNode().then(function (readData) {
    if (readData.error) {
      log('リスト読めなかったっぽい');
      return;
    }
    main(readData);
  });
} else {
  function listCallback (F) {
    var re = /\.(json|csv)$/i;
    return (F instanceof Folder || re.test(F.fsName));
  }
  var listFile = File.openDialog('サークルデータを選択', listCallback, false);
  if (listFile === null) {
    log('リストファイルが選択されていません');
  }
  cutFilePath = listFile.toString().match(/^.*\//);
  // サークルカット格納パス
  // function cutCallback (F) {
  //   var re = /\.(psd|jpg|png)$/i;
  //   return (F instanceof Folder || re.test(F.fsName));
  // }
  // var cutFile = File.openDialog('カットフォルダを選択', cutCallback, false);
  // if (cutFile === null) {
  //   log('カットフォルダが選択されていません');
  // }

  var readData = readFile(listFile);
  if (readData) {
    main(readData);
    // app.doScript(main, ScriptLanguage.javascript, readData, UndoModes.fastEntireScript);
  }
}