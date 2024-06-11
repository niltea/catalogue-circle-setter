// 元データとなるデータファイルを指定
// var listFile = '/Users/niltea/Desktop/list.csv';
// リストのファイルモード json / csv
var listMode = 'csv';
// サークルカット格納パス
// var cutFilePath = '/Users/niltea/Desktop/cut/';
// ファイル名選択 kana / id / place
var cutFileNameMode = 'id';
// ラベル組版モード？（カタログ用の見出し等処理をスキップ）
var isLabel = true;
var isSetCut = true;

// ページごとのサークル割当数
var circlesInPageCount = 24;
// ヘッダーを挿入する？
var isInsertHeader = false;
// 2spはハイフンではなく改行で繋ぐ？
var isBreakLine2sp = false;
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup-';
// 2spもスペースごとに出力（1枚にまとめない）
var isSplit2sp = true;
// circleブロックグループのprefix名
var circleBlockPrefix = 'circleGroup-';
// 準備会SPのときのカットファイル名
var jikoSPFileName = '_blank-1sp';
// カットが上がってない場合に入れるカットのprefix
var notUploadedFilePrefix = '_not_uploaded-';

var cutFilePath = null;

// 開発用サークルデータパス
var listFileDevelop = './_21906_00_test.csv';

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
/* リストファイルを読み込んで格納する */
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
      // dataCount     : layoutIndexInPage,
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
      circleData.is2SP = false;
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
            is2SP: false,
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
        page[layoutIndex].is2SP = true;
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
          is2SP : true,
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
    // サークルカットの配置
    if (cutPath && isSetCut) {
        docObj['circleCut'].place(File(cutPath));
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
