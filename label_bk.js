// 元データとなるデータファイルを指定
// var listFile = '/Users/niltea/Desktop/list.csv';
// リストのファイルモード json / csv
var listMode = 'csv';
// サークルカット格納パス
// var cutFilePath = '/Users/niltea/Desktop/cut/';
// ファイル名選択 kana / id / place
var cutFileNameMode = 'id';

// ページごとのサークル割当数
var circlesInPage = 12;
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
  return item.replace(/^['"]|['"]$/g, ''); // "
}
// CSVのparse
var parseCSV = function (CSVData) {
  // 改行コードを正規化
  CSVData.replace('\r\n', '\n');
  CSVData.replace('\r', '\n');
  // 改行コードで分割して配列に格納する
  var CSVSplitInLine = CSVData.split('\n');
  // キー名の変更
  CSVSplitInLine[0].replace('space_num', 'spaceNum');

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

/* JSONファイルを読み込んで格納する */
var readFile = function (listFile) {
  var fileObj = new File(listFile);
  var canOpenList = fileObj.open("r");

  if (canOpenList === true) {
    var readData = fileObj.read();
    fileObj.close();
    return readData;
  } else {
    log('ファイルが開けませんでした');
    return {error: true};
  }
};
/* Node.js版 JSONファイルを読み込んで格納する */
var readFileNode = function (listFile) {
  return new Promise(function (resolve, reject) {
    fs.readFile(listFile, 'utf8', function (err, readData) {
      if (err) {
        resolve({error: true});
        return;
      }
      resolve(JSON.parse(readData));
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

// JSONからprefixごとにサークルデータを取り出す
var parseEventData = function (eventData) {
  var circlesCount = eventData.length;
  log('読み込みサークル数は' + circlesCount + 'サークルです。');

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
    var spaceNumFull = circle.space_num.replace('-', ',');
    circlesInPrefix[prefix].push({
      circleID      : circle.id,
      circleName    : circle['サークル名'],
      circleNameKana: circle['サークル名（カナ）'],
      penName       : circle['ペンネーム'],
      prefix        : circle.space_sym,
      spaceNum      : spaceNum,
      spaceNo       : circle.space_sym + '-' + spaceNum,
      spaceNumFull  : spaceNumFull,
      spaceNoFull   : circle.space_sym + '-' + spaceNumFull,
      spaceNoHyp    : circle.space_sym + circle.space_num,
      spaceNumInt   : parseInt(spaceNum, 10),
      spaceCount    : circle['スペース数'],
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
// どちらもいなければダミーファイルのパスを返す
var getFilePath = function (fileName, spaceCount) {
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
  return cutFilePath + '_not_uploaded-' + spaceCount + 'sp.psd';
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
    var cutPath = getFilePath(fileName, circle.spaceCount);

    // スペース番号
    docObj['space'].contents = circle.spaceNoFull;
    // サークル名
    docObj['circleName'].contents = circle.circleName;
    // if (circle.spaceCount === '2') {
    //   // カット幅を倍にする処理
    //   var bounds = docObj['cut'].geometricBounds;
    //   // 右辺座標から左辺座標を引いてフレーム幅を求める
    //   var cutWidth = bounds[3] - bounds[1];
    //   docObj['cut'].geometricBounds = [
    //     bounds[0],
    //     bounds[1],
    //     bounds[2],
    //     docObj['cut'].geometricBounds[3] + cutWidth
    //   ];
    // }
    // サークルカットの配置
    if (cutPath) {
        docObj['circleCut'].place(File(cutPath));
    }
    
    if (docObj.options && circle.additionChair) {
      docObj.options.contents = '追加椅子 ' + circle.additionChair;
    }
    if (docObj.note && circle.isAdult) {
      docObj.note.contents = '成年向';
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

var mainProcess = function (listData, ext) {
  if (listData.error) {
    log('リスト読めなかったっぽい');
    return;
  }
  var parsedEventData = null;
  if (ext === 'csv') {
    var parsedCSV = parseCSV(listData);
    parsedEventData = parseEventData(parsedCSV);
  } else {
    parsedEventData = parseEventData(listData);
  }
  var pages = splitInPages(parsedEventData);
  if (!pages) {
    return;
  }
  log(parsedEventData.circlesCount + 'サークル\n掲載ページ数は' + pages.length + 'ページです');
  createPages(pages);
}

var main = function (listData) {  // 元データとなる json ファイルを指定
  function listCallback (F) {
    var re = /\.(json|csv)$/i;
    return (F instanceof Folder || re.test(F.fsName));
  }
  var listFile = File.openDialog('サークルデータを選択', listCallback, false);
  if (listFile === null) {
    log('リストファイルが選択されていません');
    return;
  }
  // サークルカット格納パス
  function cutCallback (F) {
    var re = /\.(psd|jpg|png)$/i;
    return (F instanceof Folder || re.test(F.fsName));
  }
  var cutFile = File.openDialog('カットフォルダを選択', cutCallback, false);
  if (cutFile === null) {
    log('カットフォルダが選択されていません');
    return;
  }
  cutFilePath = cutFile.toString().match(/^.*\//);
  if (isNode) {
    readFileNode().then(function (eventData) {
      mainProcess(eventData);
    });
  } else {
    // リストの拡張子を渡す
    var listData = readFile(listFile);
    var ext = listFile.toString().match(/[^.]+$/).toString().toLowerCase();
    mainProcess(listData, ext);
  }
};

// run main script
main();