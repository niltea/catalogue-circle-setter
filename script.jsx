// 元データとなる json ファイルを指定
var filepath = "/Users/niltea/Desktop/nijisanji02.json";
// ページごとのサークル割当数
var circlesInPage = 6;
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup';

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

var readFile = function () {
  var readData = null;
  var fileObj = new File(filepath);
  var openFlag = fileObj.open("r");

  if (openFlag === true) {
    var jsonData = fileObj.read();
    //　JSON のテキストを eval() でオブジェクト（配列）に変換
    readData = eval("(" + jsonData + ")");
    fileObj.close();
  } else {
    log("ファイルが開けませんでした");
  }
  return readData;
};
// サークルをソートする
var sortCircles = function (circlesArray) {
  return circlesArray.sort(function(a, b) {
    var num_a = parseInt(a.space_num.slice(0,2), 10);
    var num_b = parseInt(b.space_num.slice(0,2), 10);
    return num_a - num_b;
  })
};
// JSONからprefixごとにサークルデータを取り出す
var parseEventData = function (jsonData) {
  var exhibitionName = jsonData.exhibition.exhibition_name;
  var prefixArr = jsonData.sort_order;

  var circles = jsonData.circles;
  var circlesCount = circles.length;

  log('データを読み込みました\n読み込んだイベントは「' + exhibitionName + '」です。\nサークル数は' + circlesCount + 'サークルです。');

  var circlesInPrefix = {};
  var sortOrerEnd = prefixArr.length - 1;
  var sortCircleEnd = circlesCount - 1;

  for (var circleIndex = 0; circleIndex <= sortCircleEnd; circleIndex += 1) {
    var circle = circles[circleIndex];
    var prefix = circle.space_sym;
    if (!circlesInPrefix[prefix]) {
      circlesInPrefix[prefix] = [];
    }
    circlesInPrefix[prefix].push(circle);
  }
  var text = 'サークルをプレフィックス別に分割しました';
  for(var prefixIndex = 0; prefixIndex <= sortOrerEnd; prefixIndex += 1) {
    var prefix = prefixArr[prefixIndex];
    circlesInPrefix[prefix] = sortCircles(circlesInPrefix[prefix]);
    text += '\n' + prefix + ': ' + circlesInPrefix[prefix].length + 'サークル';
  }
//   log(text);

  return {
    circlesCount: circlesCount,
    circlesInPrefix: circlesInPrefix,
    exhibitionName: exhibitionName,
    prefixArr: prefixArr
  };
};

// 掲載用データを取り出す
var pickData = function (circle) {
  return {
    circleID  : circle.circle_id,
    prefix    : circle.space_sym,
    spaceNum  : circle.space_num.replace('-', ','),
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

  var prefixCount = prefixArr.length - 1;
  var prefixIndex = 0;
  for (; prefixIndex <= prefixCount; prefixIndex += 1) {
    var prefix = prefixArr[prefixIndex];
    var circles = circlesInPrefix[prefix];
    // ループ変数
    var circleCount = circles.length - 1;
    var circleIndex = 0;

    // ページ割り当て変数
    var page = {};
    var circlesInPageIndex = 0;
    var circleInPageCount = 0;
    var firstCircleInPage = null;
    var lastCircleInPage = null;
    // 余りページ存在フラグ
    var hasModPage = true;
    for (; circleIndex <= circleCount; circleIndex += 1) {
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
  // ページからcircleブロックグループを取り出す
  for (var index = 0; index <= masterPageItems.length - 1; index += 1) {
    var currentItem = masterPageItems[index];
    var key = currentItem.label;
    // 対象グループではない場合(prefixが無ければ)処理を抜ける
    if (key.indexOf(circleBlockPrefix) < 0) continue;

    // 現在のグループ内のオブジェクトを格納するObjectを作成
    targetObj[key] = {};
    var groupContainer = targetObj[key];
    // グループをオーバーライド
    var targetGroup = currentItem.override(currentPage);
    // Objectに格納
    groupContainer.group = targetGroup;
    // テキストフレームを格納する処理
    var frameLength = targetGroup.textFrames.length - 1;
    for (var frameIndex = 0; frameIndex <= frameLength; frameIndex += 1) {
      var frameItem = targetGroup.textFrames[frameIndex];
      var label = frameItem.label;
      // Objectにフレームを格納
      groupContainer[label] = frameItem;
      // 内容書き換え
      // frameItem.contents = frameIndex.toString();
    }
    // カット用フレームを格納する処理
    var rectLength = targetGroup.rectangles.length - 1;
    for (var rectIndex = 0; rectIndex <= rectLength; rectIndex += 1) {
      var rectItem = targetGroup.rectangles[rectIndex];
      var label = rectItem.label;
      // Objectにフレームを格納
      groupContainer[label] = rectItem;
      // 画像配置
      // frameItem.place(imageFilePath);
    }
  }
  return targetObj;
};

// データ流し込み関数
//   prefix: 'A',
//   range: '01-06',
//   count: circle count,
//   circleData: Object {1~circlesInPage}
var createPages = function (pageData) {
  // InDesignの変数
  // 現在開いているドキュメントを指定
  var docObj = app.activeDocument;
  // 全ページ数を取得
  var initialDocPagesCount = docObj.pages.length;

  // 流し込むデータのページ数
  var pagesToSetCount = pageData.length;
  // 作業ページのカウンター
  var pageIndex = 1;
  // for (; pageIndex <= pagesToSetCount; pageIndex += 1) {
    // 初期ページ数を上回ったら新規ページ作成
    if (pageIndex > initialDocPagesCount) {
      docObj.pages.add();
    }

    // 作業するページを取得
    var pageObj = getDocumentObject(docObj.pages[pageIndex]);

  // }
};

// InDesign用主関数
var main = function (){
  var jsonData = readFile();
  var parsedEventData = parseEventData(jsonData);
  var pages = splitInPages(parsedEventData);
  createPages(pages);
  // log('掲載ページ数は' + pages.length + 'ページです');
};

/*===== for Node =====*/
var readFileNode = function () {
  return new Promise(function (resolve, reject) {
    // Nodeのとき
    fs.readFile('./nijisanji02.json', 'utf8', function (err, data) {
      if (err) reject(err);
      var jsonData = JSON.parse(data);
      resolve(jsonData);
    });
  });
};
// Node.js用主関数
var mainNode = function () {
  readFileNode().then(function (jsonData) {
    var parsedEventData = parseEventData(jsonData);
    var pages = splitInPages(parsedEventData);
    log(pages);
    log('掲載ページ数は' + pages.length + 'ページです');
  });
};

// run main script
if (isNode) {
  mainNode();
} else {
  // main();
  getDocumentObject();
}
