// ページタイトル(prefix)
var pageTitlePrefix = 'サークル一覧(';
// ページタイトル(suffix)
var pageTitleSuffix = ')';
// ページごとのサークル割当数
// var circlesInPage = 6;
var circlesInPage = 16;
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup-';
// 小口indexのprefix名
var thumbIndexPrefix = 'index-';
// ファイル名選択 kana / id / place
var cutFileNameMode = 'id';

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
/* リストファイルを読み込んで格納する */
var readFile = function (listFile) {
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
  
  // keyをparseする
  var keys = CSVSplitInLine[0].split(',');
  for (var keyNo = 0; keyNo < keys.length; keyNo += 1) {
    switch (keys[keyNo]) {
      case 'id':
        keys[keyNo] = 'id';
      break;
      case '"サークル名"':
        keys[keyNo] = 'circle_name';
      break;
      case '"サークル名（カナ）"':
        keys[keyNo] = 'circle_kana';
      break;
      case '"ペンネーム"':
        keys[keyNo] = 'penname';
      break;
      case '"ペンネーム（カナ）"':
        keys[keyNo] = 'penname_kana';
      break;
      case 'space_sym':
        keys[keyNo] = 'space_sym';
      break;
      case 'space_num':
        keys[keyNo] = 'space_num';
      break;
      case '"スペース数"':
        keys[keyNo] = 'space_count';
      break;
      case '"合体先サークル"':
        keys[keyNo] = 'coupleWith';
      break;
      case '"追加イス"':
        keys[keyNo] = 'additionChair';
      break;
      case '"成人向け頒布物"':
        keys[keyNo] = 'isAdult';
      break;
    
      default:
        keys[keyNo] = 'void';
        break;
    }
    keys[keyNo] = stripQuote(keys[keyNo]);
  }
  // 値をparseして格納していく
  var parsedArray = [];
  // prefixを格納するやつ
  var prefixArr = [];
  for (var itemNo = 1; itemNo < CSVSplitInLine.length; itemNo += 1) {
    // 空行なら何もしない
    if (!CSVSplitInLine[itemNo].length) {
      continue;
    }

    var circle = {};
    // 値を分割
    var values = CSVSplitInLine[itemNo].split(',');

    for (var keyNo = 0; keyNo < keys.length; keyNo += 1) {
      var key = keys[keyNo];
      if (key !== 'void') {
        circle[key] = stripQuote(values[keyNo]);
      }
    }
    parsedArray.push(circle);
    var prefix = circle.space_sym;
    if (prefixArr.indexOf(prefix) < 0) {
      prefixArr.push(prefix);
    }
  }
  // 終わった配列を返す
  return {
    circles   : parsedArray,
    sort_order: prefixArr,
  };
};

// JSONからprefixごとにサークルデータを取り出す
var parseEventData = function (eventData) {
  var circles = eventData.circles;
  var circlesCount = circles.length;
  // log('読み込みサークル数は' + circlesCount + 'サークルです。');
  var prefixArr = eventData.sort_order;
  var circlesInPrefix = {};

  for (var circleIndex = 0; circleIndex < circlesCount; circleIndex += 1) {
    var circle = circles[circleIndex];
    var prefix = circle.space_sym;
    if (!circlesInPrefix[prefix]) {
      circlesInPrefix[prefix] = [];
    }
    var spaceNum = circle.space_num.split('-')[0];
    var spaceNumFull = circle.space_num.replace('-', ',');
    circlesInPrefix[prefix].push({
      circleID      : circle.id,
      circleName    : circle.circle_name,
      circleNameKana: circle.circle_kana,
      penName       : circle.penname,
      prefix        : circle.space_sym,
      spaceNum      : spaceNum,
      spaceNumFull  : spaceNumFull,
      spaceID       : circle.space_sym + '-' + spaceNum,
      spaceIDFull   : circle.space_sym + '-' + spaceNumFull,
      spaceIDHyp    : circle.space_sym + circle.space_num,
      spaceNumInt   : parseInt(spaceNum, 10),
      spaceCount    : circle.space_count ? circle.space_count : '-',
      coupleWith    : circle.coupleWith ? circle.coupleWith : '',
      additionChair : circle.additionChair ? circle.additionChair : '-',
      isAdult       : circle.isAdult ? circle.isAdult === 'あり' : '---'
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

// サークルをソートする
var sortCircles = function (circlesArray) {
  return circlesArray.sort(function(a, b) {
    var num_a = parseInt(a.spaceNum.slice(0,2), 10);
    var num_b = parseInt(b.spaceNum.slice(0,2), 10);
    return num_a - num_b;
  })
};

// ページごとにサークルデータを割り当てていく
var splitInPages = function (parsedEventData) {
  var circlesInPrefix = parsedEventData.circlesInPrefix;
  var prefixArr = parsedEventData.prefixArr;
  var prefixCount = prefixArr.length;
  if (prefixCount === 0) {
    log('prefixの並び順がセットされてないよ');
    return;
  }

  // ページ割り当て用変数
  var pages = [];
  // var pagesCount = 0;
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
  var prevSpaceNum = null;
  var pushNewPage = function (resetPrev) {
    addPage(firstCircleInPage, lastCircleInPage, page);
    // 変数のリセット
    page = new Array(circlesInPage);
    layoutIndex = 0;
    firstCircleInPage = null;
    if (resetPrev) {
      prevSpaceNum = null;
    }
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

      // 事故スペースの対応
      if (prevSpaceNum !== null) {
        while(prevSpaceNum != circleData.spaceNumInt - 1) {
          prevSpaceNum += 1;
          page[layoutIndex] = {};
          layoutIndex += 1;
          // もしあふれるなら改ページ処理
          if (layoutIndex >= circlesInPage) {
            pushNewPage();
          }
        }
      }

      if (!firstCircleInPage) firstCircleInPage = circleData;
      lastCircleInPage = circleData;
      // ページにサークルデータを追加
      page[layoutIndex] = circleData;

      prevSpaceNum = circleData.spaceNumInt;
      // 2spの時はカウントをもう1つ増やし、空きにnullを入れておく
      if (circleData.spaceCount === '2') {
        layoutIndex += 1;
        prevSpaceNum += 1;
        page[layoutIndex] = null;
      }

      layoutIndex += 1;
      // あふれるなら改ページ処理
      if (layoutIndex >= circlesInPage) {
        pushNewPage(true);
      }
    }
    // サークルループ終端
    // 余りページがあれば追加
    if (layoutIndex !== 0) {
      pushNewPage(true);
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
    // そもそもkeyがセットされてなければ処理しない
    if (!key) {
      continue;
    }
    // サークル情報のコンテナではない(prefixが無い)場合の処理
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

    // サークルデータのキャッシュ
    var circle = pageData.circleData[circleIndex - 1];
    if (circle===null) {
      // 事故スペースの対応
      // indexグループの削除
      docObj.group.remove();
      // continue;
    }

    // データ数以上のサークルを配置し終えた場合、残りのフレームを削除する
    placedCount += 1;
    if (placedCount > pageData.count) {
      docObj.group.remove();
      continue;
    }

    // スペース番号
    if (docObj.prefix && circle.prefix) {
      docObj.prefix.contents = circle.prefix;
    }
    if (docObj.spaceNum && circle.spaceNumFull) {
      docObj.spaceNum.contents = circle.spaceNumFull;
    }
    // サークル名
    if (docObj.circleName && circle.circleName) {
      docObj.circleName.contents = circle.circleName;
    }
    // ペンネーム
    if (docObj.penName && circle.penName) {
      docObj.penName.contents = circle.penName;
    }

    // 2spのときの処理（フレーム幅変更・不要フレーム削除）
    if (circle.spaceCount && circle.spaceCount === '2') {
      // placedCount += 1;
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
    var fileName = '';
    switch(cutFileNameMode) {
      case 'kana':
        if (circle.circleNameKana) {
          fileName = circle.circleNameKana;
        } else {
          fileName = '_blank';
        }
        break;
      case 'place':
        if (circle.spaceIDHyp) {
          fileName = circle.spaceIDHyp;
        } else {
          fileName = '_blank';
        }
        break;
      case 'id':
        if (circle.circleID) {
          fileName = circle.circleID;
        } else {
          fileName = '_blank';
        }
        break;
    }
    var cutPath = getFilePath(fileName, circle.spaceCount);
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

var main = function () {
  // 元データとなる json ファイルを指定
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
if (isNode) {
  main();
} else {
  main();
  // app.doScript(main, ScriptLanguage.javascript, [], UndoModes.fastEntireScript);
}
