/**
 * Sortable HTML table
 * @author Joao Rodrigues (JR) - Jan2009
 * @see Example at <https://codepen.io/jrio/pen/bvPmLo>
 * @classDescription This code is intended to sort more than one table
 * at the same time, either by their thead or tfoot sections. After numerous
 * attempts, I discovered that the code runs much faster for large tables
 * whenever sorted 'tbody' and other frequently used properties
 * are stored in jrSortTables.tableProp.
 * @version 1.2.1 - 2018-04-25 - code optimization.
 */
var jrSortTables = Object.create(null);

(function () {
  'use strict';

  jrSortTables.arrows = {
    up: '&nbsp;&#x25B4;',
    down: '&nbsp;&#x25BE;'
  };

  /**
   * tableProp array will be filled in the setup() function.
   * tableProp[tblNumber] = {
   *   'headerCells' : [], // contains [sortfn, sortdir, isSorted,
   *                       // currentSortedTBody] for each header cell.
   *   'spanArrowId' : "jrSortSpan" + tblNumber,
   *   'tbody' : tbody }
   */
  jrSortTables.tableProp = [];

  jrSortTables.sort = function (tblNumber, th) {
    // If table is already sorted by this column, then just apply sorting;
    // otherwise create currentSortedTBody for this th before applying sorting.
    // Using jrSortTables.tableProp will speed up code a lot, mainly in IE7.

    var column = th.cellIndex, prop = jrSortTables.tableProp[tblNumber],
      // tbody = th.offsetParent.tBodies[0],
      // each header cell contains [sortfn, sortdir, isSorted, currentSortedTBody]
      tbody = prop.tbody, header = prop.headerCells[column],
      sortfn = header.sortfn, sort_direction = header.sortdir,
      isSorted = header.isSorted, i, tbr, len, row,
      currentSortedTBody = header.currentSortedTBody,
      fragment = document.createDocumentFragment(),
      newSpanElem, paren, oldSpanElem;

    if (isSorted) { // tbody is already sorted
      sort_direction = (sort_direction === 'up') ? 'down' : 'up';
      if (sort_direction === 'up') {
        for (i = 0, len = currentSortedTBody.length; i < len; i++) {
          row = currentSortedTBody[i][1];
          fragment.appendChild(row);
        }
      } else { // reverse tbody
        i = currentSortedTBody.length;
        while (i) {
          row = currentSortedTBody[--i][1];
          fragment.appendChild(row);
        }
      }
      // I didn't use array.reverse because it would require one more step
      // currentSortedTBody.reverse();
    } else {
      /* This code will run only once for every column's th
       whenever that th is clicked on.
       currentSortedTBody is an array containing array elements: ['the key for sorting', row]
       */
      currentSortedTBody = [];
      // set sort_direction = 'up' in the first time.
      for (i = 0, tbr = tbody.rows, len = tbr.length; i < len; i++) {
        row = tbr[i];
        currentSortedTBody[currentSortedTBody.length] = [this.getElementText(row.cells[column]), row];
      }
      currentSortedTBody.sort(sortfn);
      jrSortTables.tableProp[tblNumber].headerCells[column].isSorted = true;
      for (i = 0; i < len; i++) {
        row = currentSortedTBody[i][1];
        fragment.appendChild(row);
      }
    }
    // Append fragment to tbody in just one operation.
    tbody.appendChild(fragment);

    // Finally, change the arrow direction in the th node
    oldSpanElem = document.getElementById(prop.spanArrowId);
    if (oldSpanElem) {
      paren = oldSpanElem.parentNode; // th node that contains span node.
      paren.removeChild(oldSpanElem);
    }
    (newSpanElem = document.createElement('span')).id = prop.spanArrowId;
    newSpanElem.innerHTML = jrSortTables.arrows[sort_direction];
    th.appendChild(newSpanElem);

    // ******** Update tableProp object ************
    jrSortTables.tableProp[tblNumber].headerCells[column].currentSortedTBody = currentSortedTBody;
    jrSortTables.tableProp[tblNumber].headerCells[column].sortdir = sort_direction;
  };

  jrSortTables.sort_functions = (function () {
    let aa, bb, tmpa, tmpb, date1, date2;
    return {
      alphaNumeric: function (a, b) {
        // a and b are arrays containing [cell text, cell's row].
        // sort in the following sequence: empty string, number then non-empty string
        aa = a[0];
        bb = b[0];
        if (aa.search(/^0+.*$/) === 0) {
          // parseFloat('0123') returns 123 which is bad because we'd need '0123'.
          tmpa = aa;
        } else {
          // parseFloat('123abc') and parseFloat('123') return a number (123);
          // parseFloat('a123') and parseFloat('abc') return NaN.
          tmpa = (aa.length) ? (isNaN(tmpa = parseFloat(aa)) ? aa : tmpa) : 0;
        }

        if (bb.search(/^0+.*$/) === 0) {
          tmpb = bb;
        } else {
          tmpb = (bb.length) ? (isNaN(tmpb = parseFloat(bb)) ? bb : tmpb) : 0;
        }

        if (typeof tmpa == 'string' && typeof tmpb == 'string') {
          return tmpa.localeCompare(tmpb); // Take accented and case-sensitive chars into account
        }
        if (typeof tmpa == 'number' && typeof tmpb == 'number') {
          return tmpa - tmpb;
        }
        // In case of different types, number < object < string
        return (typeof tmpa < typeof tmpb ? -1 : 1);
      },

      sortDate: function (a, b) { // dd/mm/yyyy
        aa = a[0];
        bb = b[0];
        date1 = aa.substr(6, 4) + aa.substr(3, 2) + aa.substr(0, 2); // turns dd-mm-yyyy into yyyymmdd
        date2 = bb.substr(6, 4) + bb.substr(3, 2) + bb.substr(0, 2);
        if (date1 === date2) { return 0; }
        if (date1 < date2) { return -1; }
        return 1;
      },

      sortDate_American: function (a, b) { // mm/dd/yyyy
        // a and b are arrays containing [cell text, cell's row].
        aa = a[0];
        bb = b[0];
        date1 = aa.substr(6, 4) + aa.substr(0, 2) + aa.substr(3, 2); // turns mm-dd-yyyy into yyyymmdd
        date2 = bb.substr(6, 4) + bb.substr(0, 2) + bb.substr(3, 2);
        if (date1 === date2) { return 0; }
        if (date1 < date2) { return -1; }
        return 1;
      },

      sortNumberJS: function (a, b) {
        let re = /[^\d.-]+/g; // remove the thousands separator, currency and % symbols
        aa = a[0].replace(re, '').replace(/,/g, '');
        bb = b[0].replace(re, '').replace(/,/g, '');
        if (isNaN(aa)) { aa = 0; }
        if (isNaN(bb)) { bb = 0; }
        return aa - bb;
      },

      sortNumber_nonJS: function (a, b) {
        // e.g. 23,478.96 in English/JS or 23.478,96 in Portuguese
        let re = /[^\d,-]+/g; // remove the thousands separator, currency and % symbols
        aa = a[0].replace(re, '').replace(/\./g, '');
        bb = b[0].replace(re, '').replace(/\./g, '');
        // Then exchange the decimal separator (comma) to a dot.
        aa = aa.replace(/,/, '.');
        bb = bb.replace(/,/, '.');
        if (isNaN(aa)) { aa = 0; }
        if (isNaN(bb)) { bb = 0; }
        return aa - bb;
      }
    };
  }());

  jrSortTables.getElementText = function (el) {
    return (el.textContent).replace(/^\s+|\s+$/g, '');
  };

  jrSortTables.setup = function () {

    function prepareTables(tableElem, tblNumber) {
      var thead, tbody, i, len, arrTh,
          fn, rxFn, sortFunctions = jrSortTables.sort_functions,
          arr = [];

      function addOnClickEvt() {
        jrSortTables.sort(tblNumber, this); // this refers to a th cell.
        // return false;
      }

      function addEvent(row) {
        var cells = row.cells, len = cells.length;
        while (len--) {
          cells[len].onclick = addOnClickEvt;
        }
      }

      /** Try to guess the data type of the column's first cell. Assume
       *  that the other cells of this column will have the same data type.
       */
      function guessDataType(txtCell) {
        var sortfn, testDate;
        if (txtCell.length > 0) {
          // if (txtCell.match(/^\-?[R$£€¤\s]*?[\d,.]+%?$/)) {
          if (txtCell.match(/^-?\D*?[\d,.]+[\s%]*?$/)) { // currency, number or percentile
            return sortFunctions.sortNumberJS;
          }
          testDate = (txtCell.match(/^(\d\d?)[/.-](\d\d?)[/.-]((\d\d)?\d\d)$/));
          if (testDate) {
            // Expect for dd/mm/yyyy or mm/dd/yyyy, using / - . as separators
            if (parseInt(testDate[1], 10) > 12) { // dd/mm
              sortfn = sortFunctions.sortDate;
            } else if (parseInt(testDate[2], 10) > 12) { // mm/dd
              sortfn = sortFunctions.sortDate_American;
            } else { // Sorry, we'll assume dd/mm
              sortfn = sortFunctions.sortDate;
            }
          }
        }
        // alphaNumeric is the default sort function.
        return sortfn || sortFunctions.alphaNumeric;
      }

      // Create a RegExp with the sort methods names.
      for (i in sortFunctions) {
        if (sortFunctions.hasOwnProperty(i)) arr.push(i);
      }
      rxFn = new RegExp(arr.join('|'));

      function getSortFn(className) {
        // var re = /alphaNumeric|sortDate|sortDate_American|sortNumberJS|sortNumber_nonJS/;
        var found = rxFn.exec(className);
        return (found) ? sortFunctions[found[0]] : '';
      }


      thead = tableElem.tHead;
      tbody = tableElem.tBodies[0];
      //if (tbody.rows.length === 0) { return; }

      jrSortTables.tableProp[tblNumber] = {
        "headerCells": [], // will contain [sortfn, sortdir, isSorted,
        // currentSortedTBody] for each header cell.
        "spanArrowId": "jrSortSpan" + tblNumber,
        "tbody": tbody
      };

      arrTh = thead.rows[0].cells;
      for (i = 0, len = arrTh.length; i < len; i++) {
        arrTh[i].sortdir = 'up';
        arrTh[i].isSorted = false;
        fn = getSortFn(arrTh[i].className);
        arrTh[i].sortfn = fn || guessDataType(
          jrSortTables.getElementText(tbody.rows[0].cells[i])
        );
      }
      jrSortTables.tableProp[tblNumber].headerCells = arrTh;

      // Finally, add the onclick event.
      // thead's first row contains all th tags.
      addEvent(thead.rows[0]);
      // tfoot's first row contains all th tags.
      if (tableElem.tFoot) {
        addEvent(tableElem.tFoot.rows[0]);
      }
    }

    // Prepare tables for sorting.
    var tables = document.querySelectorAll('.sortable');
    [].forEach.call(tables, function (tbl) {
      prepareTables(tbl);
    });
    tables = null;
  };

}());

window.addEventListener('load', jrSortTables.setup, false);