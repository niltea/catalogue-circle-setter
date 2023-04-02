// 元データとなる json ファイルを指定
var listFile = '/Users/niltea/Desktop/nijisanji06.csv';
var isCSV = true;
// サークルカット格納パス
var cutFilePath = '/Users/niltea/Desktop/cut/';

// ページタイトル(prefix)
var pageTitlePrefix = 'サークル一覧(';
// ページタイトル(suffix)
var pageTitleSuffix = ')';
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
  CSVSplitInLine = CSVData.split('\n');

  // keyをparseする
  var keys = CSVSplitInLine[0].split(',');
  for (var keyNo = 0; keyNo < keys.length; keyNo += 1) {
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

    for (var keyNo = 0; keyNo < keys.length; keyNo += 1) {
      lineObject[keys[keyNo]] = stripQuote(values[keyNo]);
    }
    parsedArray.push(lineObject);
  }
  // 終わった配列を返す
  return parsedArray;
};

// CSVからprefixごとにサークルデータを取り出す
var parseEventCSVData = function (eventData) {
  var circlesCount = eventData.length;
  //log('読み込みサークル数は' + circlesCount + 'サークルです。');

  var circlesInPrefix = {};
  var prefixArr = [];
  for (var circleIndex = 0; circleIndex < circlesCount; circleIndex += 1) {
    var circle = eventData[circleIndex];
    var prefix = circle.space_sym;
    if (!circlesInPrefix[prefix]) {
      circlesInPrefix[prefix] = [];
      prefixArr.push(prefix);
    }
    var spaceNum = circle.space_num.split('-')[0];
    circlesInPrefix[prefix].push({
      circle_id      : circle.id,
      circle_name    : circle['サークル名'],
      circle_kana :  circle['サークル名（カナ）'],
      penname       : circle['ペンネーム'],
      space_sym        : circle.space_sym,
      space_num      : spaceNum,
      spaceNo       : circle.space_sym + '-' + spaceNum,
      spaceNumInt   : parseInt(spaceNum, 10),
      space_count    : circle['スペース数'],
      coupleWith    : circle['合体先サークル'],
      additionChair : circle['追加イス'],
      isAdult       : circle['成人向け頒布物'] === 'あり'
    });
  }
  var sortOrderEnd = prefixArr.length - 1;
  for(var prefixIndex = 0; prefixIndex <= sortOrderEnd; prefixIndex += 1) {
    var prefix = prefixArr[prefixIndex];
    // 各プレフィクスごとにソートする
    circlesInPrefix[prefix] = sortCircles(circlesInPrefix[prefix]);
  }
  return {
    circlesCount: circlesCount,
    circlesInPrefix: circlesInPrefix,
    prefixArr: prefixArr
  };
};
/* JSONファイルを読み込んで格納する */
var readFile = function () {
  var listFileObj = new File(listFile);
  var canOpenList = listFileObj.open("r");

  if (canOpenList === true) {
    var listData = listFileObj.read();
    
      if (isCSV) {
        listFileObj.close();
        return listData;
      } else {
        //　JSON のテキストを eval() でオブジェクト（配列）に変換
        var readData = eval("(" + listData + ")");
        listFileObj.close();
        return readData;
    }
    
  } else {
    log("ファイルが開けませんでした");
    return {error: true};
  }
};
/* Node.js版 JSONファイルを読み込んで格納する */
var readFileNode = function () {
  return new Promise(function (resolve, reject) {
    fs.readFile(listFile, 'utf8', function (err, readData) {
      if (err) {
        resolve({error: true});
        return;
      }
      if (isCSV) {
      resolve(readData);
        } else {
      resolve(JSON.parse(readData));
      }
    });
  });
};
// JSONからprefixごとにサークルデータを取り出す
var parseEventData = function (jsonData) {
  var prefixArr = jsonData.sort_order;

  var circles = jsonData.circles;
  var circlesCount = circles.length;

  var circlesInPrefix = {};
  var sortOrderEnd = prefixArr.length - 1;
  var sortCircleEnd = circlesCount - 1;

  for (var circleIndex = 0; circleIndex <= sortCircleEnd; circleIndex += 1) {
    var circle = circles[circleIndex];

    var prefix = circle.space_sym;
    if (!circlesInPrefix[prefix]) {
      circlesInPrefix[prefix] = [];
    }
    circlesInPrefix[prefix].push(circle);
  }
  for(var prefixIndex = 0; prefixIndex <= sortOrderEnd; prefixIndex += 1) {
    var prefix = prefixArr[prefixIndex];
    // 各プレフィクスごとにソートする
    circlesInPrefix[prefix] = sortCircles(circlesInPrefix[prefix]);
  }

  return {
    circlesCount: circlesCount,
    circlesInPrefix: circlesInPrefix,
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
var pruneData = function (circle) {
  return {
    circleID  : circle.circle_id,
    prefix    : circle.space_sym,
    spaceNum  : circle.space_num,
    spaceNumInt: circle.spaceNumInt,
    penName   : circle.penname,
    circleName: circle.circle_name,
    circleKana: circle.circle_kana,
    spaceCount: circle.space_count
  };
};

// ページごとにサークルデータを割り当てていく
var splitInPages = function (parsedEventData) {
  // var circlesCount = parsedEventData.circlesCount;
  var circlesInPrefix = parsedEventData.circlesInPrefix;
  var prefixArr = parsedEventData.prefixArr;
  var prefixCount = prefixArr.length;
  if (prefixCount === 0) {
    log('prefixの並び順がセットされてないよ');
    return;
  }

  // ページ割り当て用変数
  var pages = [];
  var pagesCount = 0;
  // circlesInPage = (public) circlesInPage;

  // ページ挿入関数
  var addPage = function (firstCircleInPage, lastCircleInPage, page) {
    var firstCircleNo = firstCircleInPage.spaceNum.slice(0, 2);
    var lastCircleNo  = lastCircleInPage.spaceNum.slice(-2);
    var count = 0;
    for(i = 0; i < circlesInPage; i += 1) {
      if (page[i]) {
        count += 1;
      }
    }
    pages.push({
      prefix    : firstCircleInPage.prefix,
      range     : firstCircleNo + '-' + lastCircleNo,
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
  // prefixごとにページを作成していく
  for (var prefixIndex = 0; prefixIndex < prefixCount; prefixIndex += 1) {
    // 現在のprefixを設定
    var prefix = prefixArr[prefixIndex];
    // 当該prefixのサークル一覧を抽出
    var circles = circlesInPrefix[prefix];
    // ループ変数
    var circleCount = circles.length - 1;

    // サークルをページに割り当てていく
    for (var circleIndex = 0; circleIndex <= circleCount; circleIndex += 1) {
      // 掲載データの取りだし
      var circleData = pruneData(circles[circleIndex]);

      // 2spかつ配置indexが奇数のときはもう1増やしとく
      if (circleData.spaceCount === '2' && layoutIndex % 2 == 1) {
        page[layoutIndex] = null;
        layoutIndex += 1;
        // もしあふれるなら改ページ処理
        if (layoutIndex >= circlesInPage) {
          pushNewPage();
        }
      }

      if (!firstCircleInPage) firstCircleInPage = circleData;
      lastCircleInPage = circleData;
      // ページにサークルデータを追加
      page[layoutIndex] = circleData;

      // 2spの時はカウントをもう1つ増やし、空きにnullを入れておく
      if (circleData.spaceCount === '2') {
        layoutIndex += 1;
        page[layoutIndex] = null;
      }

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
    var circle = pageData.circleData[circleIndex - 1];

    // スペース番号
    docObj.prefix.contents = circle.prefix;
    if (circle.spaceCount === '2') {
        docObj.spaceNum.contents = ('0' + circle.spaceNumInt).slice(-2) + ',' + ('0' + (circle.spaceNumInt + 1)).slice(-2);
    } else {
        docObj.spaceNum.contents = ('0' + circle.spaceNumInt).slice(-2);
    }
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
      // カット幅を倍にする
      var bounds = docObj.circleCut.geometricBounds;
      var cutWidth = bounds[3] - bounds[1];
      docObj.circleCut.geometricBounds = [
        bounds[0],
        bounds[1],
        bounds[2],
        docObj.circleCut.geometricBounds[3] + cutWidth
      ];
      // 一コマ送る
      circleIndex += 1;
      // 次indexグループの削除
      pageObj[circleBlockPrefix + ('0' + circleIndex).slice(-2)].group.remove();
    }
    // 画像配置
    // var cutPath = getFilePath(circle.prefix + circle.spaceNum);
    var cutPath = getFilePath(circle.circleID);

//     var cutPath = getFilePath(circle.circleKana);
    if (cutPath) {
      docObj.circleCut.place(File(cutPath));
      docObj.circleCut.fit(EmptyFrameFittingOptions.CONTENT_TO_FRAME);
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

var mainCSV = function (CSVData) {
  if (CSVData.error) {
    log('リスト読めなかったっぽい');
    return;
  }
  var eventData = parseCSV(CSVData);
  var parsedEventData = parseEventCSVData(eventData);
  var pages = splitInPages(parsedEventData);
  if (!pages) {
    return;
  }
  log(parsedEventData.circlesCount + 'サークル\n掲載ページ数は' + pages.length + 'ページです');
  createPages(pages);
};

var main = function (jsonData) {
  if (jsonData.error) {
    log('リスト読めなかったっぽい');
    return;
  }
  var parsedEventData = parseEventData(jsonData);
  var pages = splitInPages(parsedEventData);
  if (!pages) {
    return;
  }
  log(parsedEventData.circlesCount + 'サークル\n掲載ページ数は' + pages.length + 'ページです');
  createPages(pages);
};

// run main script
if (isNode) {
  readFileNode().then(function (jsonData) {
      if (isCSV) {
        mainCSV(jsonData);
        } else {
        main(jsonData);
      }
  });
} else {
    var jsonData = readFile();
      if (isCSV) {
        mainCSV(jsonData);
        } else {
        main(jsonData);
      }
}
