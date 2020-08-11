// 元データとなる json ファイルを指定
var filepath = '~/Desktop/holokle-1st.json';
// サークルカット格納パス
var cutFilePath = '~/Desktop/circlecut/';

// ページタイトル(prefix)
var pageTitlePrefix = 'サークル一覧 / ';
// ページタイトル(suffix)
var pageTitleSuffix = '';
// ページごとのサークル割当数
var circlesInPage = 16;
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup-';
// 小口indexのprefix名
var thumbIndexPrefix = 'index-';

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

// InDesign用主関数
var main = function (){
  var jsonData = readFile();
  var parsedEventData = parseEventData(jsonData);
  var pages = splitInPages(parsedEventData);
  createPages(pages);
  // log('掲載ページ数は' + pages.length + 'ページです');
};

/* Node.js用主関数 */
var mainNode = function () {
  readFileNode().then(function (jsonData) {
    log('Node.JS環境で動作中');
    var parsedEventData = parseEventData(jsonData);
    var pages = splitInPages(parsedEventData);
    log(pages);
    log('掲載ページ数は' + pages.length + 'ページです');
  createPages(pages);
  });
};

/* JSONファイルを読み込んで格納する */
var readFile = function () {
  var fileObj = new File(filepath);
  var openFlag = fileObj.open("r");

  if (openFlag === true) {
    var jsonData = fileObj.read();
    //　JSON のテキストを eval() でオブジェクト（配列）に変換
    var readData = eval("(" + jsonData + ")");
    fileObj.close();
    return readData;
  } else {
    log("ファイルが開けませんでした");
  }
};
/* Node.js版 JSONファイルを読み込んで格納する */
var readFileNode = function () {
  return new Promise(function (resolve, reject) {
    // Nodeのとき
    fs.readFile(filepath, 'utf8', function (err, readData) {
      if (err) reject(err);
      resolve(JSON.parse(readData));
    });
  });
};
// JSONからprefixごとにサークルデータを取り出す
var parseEventData = function (jsonData) {
  var exhibitionName = jsonData.exhibition.exhibition_name;
  var prefixArr = jsonData.sort_order;

  var circles = jsonData.circles;
  var circlesCount = circles.length;

  var circlesInPrefix = {};
  var sortOrerEnd = prefixArr.length - 1;
  var sortCircleEnd = circlesCount - 1;
  log(circlesCount + 'サークルのデータを読み込みました。');

  for (var circleIndex = 0; circleIndex <= sortCircleEnd; circleIndex += 1) {
    var circle = circles[circleIndex];

    var prefix = circle.space_sym;
    if (!circlesInPrefix[prefix]) {
      circlesInPrefix[prefix] = [];
    }
    circlesInPrefix[prefix].push(circle);
  }
  for(var prefixIndex = 0; prefixIndex <= sortOrerEnd; prefixIndex += 1) {
    var prefix = prefixArr[prefixIndex];
    // 各プレフィクスごとにソートする
    circlesInPrefix[prefix] = sortCircles(circlesInPrefix[prefix]);
  }

  return {
    circlesCount: circlesCount,
    circlesInPrefix: circlesInPrefix,
    exhibitionName: exhibitionName,
    prefixArr: prefixArr
  };
};

// サークルをソートする
var sortCircles = function (circlesArray) {
  return circlesArray.sort(function(a, b) {
    var num_a = parseInt(a.space_num.slice(0,2), 10);
    var num_b = parseInt(b.space_num.slice(0,2), 10);
    return num_a - num_b;
  })
};

// 掲載用データを取り出す
var pickData = function (circle) {
  return {
    circleID  : circle.circle_id,
    prefix    : circle.space_sym,
    spaceNum  : circle.space_num,
    penName   : circle.penname,
    circleName: circle.circle_name,
    spaceCount: circle.space_count
  };
};

// ページごとにサークルデータを割り当てていく
var splitInPages = function (parsedEventData) {
  // var circlesCount = parsedEventData.circlesCount;
  var circlesInPrefix = parsedEventData.circlesInPrefix;
  // var exhibitionName = parsedEventData.exhibitionName;
  var prefixArr = parsedEventData.prefixArr;

  // ページ割り当て用変数
  var pages = [];
  var pagesCount = 0;
  // circlesInPage = (public) circlesInPage;

  // ページ挿入関数
  var addPage = function (firstCircleInPage, lastCircleInPage, circlesInPageIndex, page) {
    var firstCircleNo = firstCircleInPage.spaceNum.slice(0, 2);
    var lastCircleNo  = lastCircleInPage.spaceNum.slice(-2);
    pages.push({
      prefix    : firstCircleInPage.prefix,
      range     : firstCircleNo + '-' + lastCircleNo,
      count     : circlesInPageIndex,
      circleData: page,
    });
  };

  var prefixCount = prefixArr.length;
  for (var prefixIndex = 0; prefixIndex < prefixCount; prefixIndex += 1) {
    var prefix = prefixArr[prefixIndex];
    var circles = circlesInPrefix[prefix];
    // ループ変数
    var circleCount = circles.length - 1;

    // ページ割り当て変数
    var page = {};
    var circlesInPageIndex = 0;
    var circleInPageCount = 0;
    var firstCircleInPage = null;
    var lastCircleInPage = null;
    for (var circleIndex = 0; circleIndex <= circleCount; circleIndex += 1) {
      var circle = circles[circleIndex];
      circlesInPageIndex += 1;
      circleInPageCount += 1;

      // 掲載データの取りだし
      var circleData = pickData(circle);
      if (!firstCircleInPage) firstCircleInPage = circleData;
      lastCircleInPage = circleData;
      // ページにサークルデータを追加
      page[circlesInPageIndex] = circleData;

      // 2spの時はカウントを1つ増やす
      if (circleData.spaceCount === '2') {
        circlesInPageIndex += 1;
        page[circlesInPageIndex] = null;
      }

      // 改ページ処理
      if (circlesInPageIndex >= circlesInPage) {
        addPage(firstCircleInPage, lastCircleInPage, circleInPageCount, page);
        // 変数のリセット
        page = {};
        circlesInPageIndex = 0;
        circleInPageCount = 0;
        firstCircleInPage = null;
      }
    }
    // サークルループ終端
    // 余りページがあれば追加
    if (circlesInPageIndex !== 0) {
      addPage(firstCircleInPage, lastCircleInPage, circlesInPageIndex, page);
    }
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
    // 対象グループではない場合(prefixが無ければ)処理を抜ける
    if (key.indexOf(circleBlockPrefix) < 0) {
      // ページタイトルobjectを格納
      if (key === 'pageTitle') {
        targetObj.pageTitle = currentItem.override(currentPage);
      }
      // 小口indexを格納
      if (key.indexOf(thumbIndexPrefix) >= 0) {
        targetObj.thumbIndexes[key] = currentItem.override(currentPage);;
      }
      // 残りの処理は関係ないので抜ける
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
  // ページタイトルのセット
  var pageTitle = pageTitlePrefix + pageData.prefix + pageData.range + pageTitleSuffix;
  pageObj.pageTitle.contents = pageTitle;
  // 小口indexの不要アイテム削除
  var indexTargetKey = thumbIndexPrefix + pageData.prefix;
  for (var key in pageObj.thumbIndexes) {
    if (key !== indexTargetKey) pageObj.thumbIndexes[key].remove();
  }

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
    var circle = pageData.circleData[circleIndex];

    // スペース番号
    docObj.prefix.contents = circle.prefix;
    docObj.spaceNum.contents = circle.spaceNum.replace(',', '-');
    // サークル名
    if (docObj.circleName) {
      docObj.circleName.contents = circle.circleName;
    }
    // ペンネーム
    if (docObj.penName) {
      docObj.penName.contents = circle.penName;
    }
    
    // 2spのときの処理（フレーム幅変更・不要フレーム削除）
    if (circle.spaceCount === '2') {
      placedCount += 1;
      // カット幅を倍にする
      var cutgeometricBounds = docObj.circleCut.geometricBounds;
      cutgeometricBounds[3] += 35;
      docObj.circleCut.geometricBounds = cutgeometricBounds;
      circleIndex += 1;
      // 次indexはグループごと削除
      var nextDocObj = pageObj[circleBlockPrefix + ('0' + circleIndex).slice(-2)];
      nextDocObj.group.remove();
    }
    // 画像配置
    var cutPath = getFilePath(circle.prefix + circle.spaceNum);
    if (cutPath) {
      docObj.circleCut.place(File(cutPath));
      docObj.circleCut.fit(EmptyFrameFittingOptions.CONTENT_TO_FRAME);
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
  var master = app.activeDocument.masterSpreads[1];
  for (; pageIndex < pagesToSetCount; pageIndex += 1) {
    // 初期ページ数を上回ったら新規ページ作成
    if (pageIndex > initialDocPagesCount) {
      docObj.pages.add(LocationOptions.AT_END, master);
    }

    // 作業するページを取得
    var pageObj = getDocumentObject(docObj.pages[pageIndex]);
    setData(pageObj, pageDataArr[pageIndex]);
  }
};

// run main script
if (isNode) {
  mainNode();
} else {
  main();
  // app.doScript(
  //   main,
  //   ScriptLanguage.JAVASCRIPT,
  //   null,
  //   UndoModes.FAST_ENTIRE_SCRIPT,
  //   'サークルデータ流し込み'
  // );
}
