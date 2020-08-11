// 元データとなる json ファイルを指定
var filepath = '~/Desktop/holokle-1st.csv';
// サークルカット格納パス
var cutFilePath = '~/Desktop/circlecut/';

// ページごとのサークル割当数
var circlesInPage = 21;
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup-';

// Node.js環境かどうか調べる
var isNode = (typeof process !== "undefined" && typeof require !== "undefined");
// Nodeならfsをrequireする
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
  return item.replace(/^['"]|['"]$/g, '');
}
// CSVのparse
var parseCSV = function (CSVData) {
  // 改行コードを正規化
  CSVData.replace('\r\n', '\n');
  CSVData.replace('\r', '\n');
  // 改行コードで分割して配列に格納する
  var CSVSplitInLine = CSVData.split('\n');

  // keyをparseする
  var keys = CSVSplitInLine[0].split(',');
  for (var keyNo = 1; keyNo < keys.length; keyNo += 1) {
    keys[keyNo] = stripQuote(keys[keyNo]);
  }
  // 値をparseして格納していく
  var parsedArray = [];
  for (var itemNo = 1; itemNo < CSVSplitInLine.length; itemNo += 1) {
    // 空行なら何もしない
    if (!CSVSplitInLine[itemNo].length) {
      continue;
    }

    var lineObject = {};
    // 値を分割
    var values = CSVSplitInLine[itemNo].split(',');

    for (var keyNo = 1; keyNo < keys.length; keyNo += 1) {
      lineObject[keys[keyNo]] = stripQuote(values[keyNo]);
    }
    parsedArray.push(lineObject);
  }
  // 終わった配列を返す
  return parsedArray;
};

// サークルをソートする
var sortCircles = function (circlesArray) {
  return circlesArray.sort(function(a, b) {
    var num_a = a.spaceNumInt;
    var num_b = b.spaceNumInt;
    return num_a - num_b;
  })
};
// JSONからprefixごとにサークルデータを取り出す
var parseEventData = function (eventData) {
  var circlesCount = eventData.length;
  log('読み込みサークル数は' + circlesCount + 'サークルです。');

  var circlesInPrefix = {};
  for (var circleIndex = 0; circleIndex < circlesCount; circleIndex += 1) {
    var circle = eventData[circleIndex];
    var prefix = circle.space_sym;
    if (!circlesInPrefix[prefix]) {
      circlesInPrefix[prefix] = [];
    }
    var spaceNum = circle.space_num.split('-')[0];
    circlesInPrefix[prefix].push({
      circleName    : circle['サークル名'],
      writer        : circle['ペンネーム'],
      spaceNo       : circle.space_sym + '-' + circle.space_num,
      spaceNumInt   : parseInt(spaceNum, 10),
      space_count   : circle['スペース数'],
      coupleWith    : circle['合体先サークル'],
      additionChair : circle['追加イス'] || '0',
      isAdult       : circle['成人向け頒布物'] === 'あり',
      fileName      : circle.space_sym + circle.space_num
    });
  }

  var prefixArr = [];

  for (prop in circlesInPrefix) {
    if (hasOwnProperty.call(circlesInPrefix, prop)) {
      prefixArr.push(prop);
    }
  }
  var prefixCount = prefixArr.length - 1;
  var text = 'サークルをプレフィックス別に分割しました';
  for(var prefixIndex = 0; prefixIndex <= prefixCount; prefixIndex += 1) {
    var prefix = prefixArr[prefixIndex];
    circlesInPrefix[prefix] = sortCircles(circlesInPrefix[prefix]);
    text += '\n' + prefix + ': ' + circlesInPrefix[prefix].length + 'サークル';
  }
  return {
    circlesCount   : circlesCount,
    circlesInPrefix: circlesInPrefix,
    prefixArr      : prefixArr,
    prefixCount    : prefixCount
  };
};

// ページごとにサークルデータを割り当てていく
var splitInPages = function (parsedEventData) {
  // var circlesCount = parsedEventData.circlesCount;
  var circlesInPrefix = parsedEventData.circlesInPrefix;
  var prefixArr = parsedEventData.prefixArr;

  // ページ割り当て用変数
  var pages = [];
  var pageCount = 0;

  var prefixCount = prefixArr.length;
  for (var prefixIndex = 0; prefixIndex < prefixCount; prefixIndex += 1) {
    var currentPrefix = prefixArr[prefixIndex];
    var circles = circlesInPrefix[currentPrefix];

    // ページ割り当て変数
    var circlesCount = 0;

    // 改ページ処理
    pages.push({
      circleData: [],
      circlesCount: 0
    });
    // サークルループ
    for (var circleIndex = 0; circleIndex < circles.length; circleIndex += 1) {
      pages[pageCount].circlesCount += 1;
      // 改ページ処理
      if (pages[pageCount].circlesCount > circlesInPage) {
        pages.push({
          circleData: [],
          circlesCount: 0
        });
        pageCount += 1;
      }

      var circle = circles[circleIndex];

      pages[pageCount]['circleData'].push(circle);
      pages[pageCount].prefix = currentPrefix;
    }
    // prefix変わるのでpage変更
    pageCount += 1;
  }
  return pages;
};

var getDocumentObject = function (currentPage) {
  var masterPageItems = currentPage.masterPageItems;
  // グループを格納するObject
  var targetObj = {};
  // ページからcircleブロックグループを取り出す
  for (var index = 0; index < masterPageItems.length; index += 1) {
    // 現在のグループ内のオブジェクトを格納するObjectを作成
    var groupContainer = {};
    // 操作対象の取り出し
    var currentItem = masterPageItems[index];
    var key = currentItem.label;
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
    targetObj[key] = groupContainer;
  }
  return targetObj;
};

// PNG -> JPGの優先度でいずれか存在するファイルパスを返す
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
  for(var circleIndex = 0; circleIndex < circlesInPage; circleIndex += 1) {
    var docObj = pageObj[circleBlockPrefix + ('0' + circleIndex).slice(-2)];
    // データ数以上のサークルを配置し終えた場合、残りのフレームを削除する
    placedCount += 1;
    if (placedCount >= pageData.circlesCount) {
      docObj.group.remove();
      continue;
    }

    // サークルデータのキャッシュ
    var circle = pageData.circleData[circleIndex];

    var spaceCount = circle.space_count + 'sp';

    // スペース番号
    if (circle) {
      docObj['space-' + spaceCount].contents = circle.spaceNo;
      // サークル名
      docObj['circleName-' + spaceCount].contents = circle.circleName;
      // 備考欄
      docObj.remarks.contents = circle.space_count + 'sp / ' + circle.additionChair;
      // 画像配置
      var circleCutFile = getFilePath(circle.fileName);
  log(circleCutFile)
      if (circleCutFile) {
        docObj['cut-' + spaceCount].place(circleCutFile);
        docObj['cut-' + spaceCount].fit(EmptyFrameFittingOptions.CONTENT_TO_FRAME);
      }
    } else {
      docObj.prefix.contents = "XXXX";
      // log("Err: no circle");
    }
  }
};
// データ流し込み関数
var createPages = function (pageDataArr) {
  // InDesignの変数
  // 現在開いているドキュメントを指定
  var docObj = app.activeDocument;
  // 全ページ数を取得
  var initialDocPagesCount = docObj.pages.length - 1;
  // 流し込むデータのページ数
  var pagesToSetCount = pageDataArr.length;
  // 作業ページのカウンター
  var pageIndex = 0;
  // マスターページ
  var master = docObj.masterSpreads[0];
  for (; pageIndex < pagesToSetCount; pageIndex += 1) {
    // 初期ページ数を上回ったら新規ページ作成
    if (pageIndex > initialDocPagesCount) {
    return;
      docObj.pages.add(LocationOptions.AT_END, master);
    }

    // 作業するページを取得
    var pageObj = getDocumentObject(docObj.pages[pageIndex]);
    // データの流し込み
    setData(pageObj, pageDataArr[pageIndex]);
  }
};
var readFile = function () {
  var readData = null;
  var fileObj = new File(filepath);
  var openFlag = fileObj.open("r");

  if (openFlag === true) {
    readData = fileObj.read();
    fileObj.close();
  } else {
    log("ファイルが開けませんでした");
    return null;
  }
  return readData;
};
// InDesign用主関数
var mainID = function (){
  var CSVData = readFile();
  if (!CSVData) return;
  var eventData = parseCSV(CSVData);
  var parsedEventData = parseEventData(eventData);
  var pages = splitInPages(parsedEventData);
  createPages(pages);
  // log('掲載ページ数は' + pages.length + 'ページです');
};
/*===== for Node =====*/
var readFileNode = function () {
  return new Promise(function (resolve, reject) {
    // Nodeのとき
    fs.readFile(filepath, 'utf8', function (err, data) {
      if (err) reject(err);
      resolve(data);
    });
  });
};
// Node.js用主関数
var mainNode = function () {
  readFileNode().then(function (CSVData) {
    var eventData = parseCSV(CSVData);
    var parsedEventData = parseEventData(eventData);
    var pages = splitInPages(parsedEventData);

    log('出力枚数は' + pages.length + '枚です');
  });
};

// run main script
if (isNode) {
  mainNode();
} else {
  mainID();
  // app.doScript(
  //   main,
  //   ScriptLanguage.JAVASCRIPT,
  //   null,
  //   UndoModes.FAST_ENTIRE_SCRIPT,
  //   'サークルデータ流し込み'
  // );
}
