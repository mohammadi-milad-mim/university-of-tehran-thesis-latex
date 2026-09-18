%% ut-thesis.cls
%% Modern native XeLaTeX class for the University of Tehran thesis kit.
%%
%% Layout and page structure are derived from tehran-thesis by Sina Momken
%% (GPL-3.0).  The upstream GPL-3.0 license is retained in LICENSE.  This rewrite keeps the University of Tehran layout
%% contract while replacing the 2017 implementation with maintained packages,
%% semantic metadata, BibLaTeX/Biber, and glossary interfaces.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{ut-thesis}[2026/08/30 v1.0 Native University of Tehran thesis]

\DeclareOption*{\PassOptionsToClass{\CurrentOption}{book}}
\ProcessOptions\relax
\LoadClass[12pt,a4paper,twoside,openany]{book}

\RequirePackage{fix-cm}
\RequirePackage{amsmath,amssymb,amsthm}
% The final template layout deliberately uses a uniform 25 mm safe
% area on every Persian and English page.  This differs from the asymmetric
% margins in the 1403 University of Tehran guideline.
\RequirePackage[a4paper,margin=25mm]{geometry}
\RequirePackage{graphicx}
\RequirePackage{float}
\RequirePackage{xcolor}
\RequirePackage{array,longtable,tabularx,booktabs,multirow,calc,etoolbox}
\RequirePackage{pdflscape,multicol,enumitem,rotating}
\RequirePackage{tikz}
\RequirePackage{fancyhdr}
\RequirePackage{setspace}
\RequirePackage{caption}
\RequirePackage{titlesec}
\RequirePackage{pgfkeys}
% Absolute destination names avoid collisions when the visible folio scheme is
% reset between the unnumbered preliminaries, main matter, and closing pages.
% XePersian/bidi supplies its own longtable implementation after hyperref is
% loaded, so retain caption's native anchor instead of hyperref's incompatible
% LT@start patch (which otherwise emits every destination twice).
\def\hyper@nopatch@longtable{}
\RequirePackage[
  unicode=true,
  hidelinks,
  pdfborder={0 0 0},
  hypertexnames=false,
  linktoc=none
]{hyperref}
\IfFileExists{xurl.sty}{\RequirePackage{xurl}}{}
\urlstyle{same}
\RequirePackage[
  backend=biber,
  style=ieee,
  sorting=none,
  sortcites=true,
  maxbibnames=99,
  giveninits=true,
  doi=true,
  url=true
]{biblatex}
\RequirePackage[acronym,nonumberlist,toc]{glossaries}
\newglossary[faeng]{faen}{faeni}{faeno}{واژه‌نامه فارسی به انگلیسی}
\newglossary[enfag]{enfa}{enfai}{enfao}{English to Persian glossary}
\makenoidxglossaries
% First-use glossary forms contain an English footnote.  Disabling term links
% prevents a glossary hyperlink from nesting around the footnote hyperlink;
% citations, references, the ToC, and printed glossary targets remain linked.
\glsdisablehyper

% XePersian remains the final language package loaded by the class.
\RequirePackage[extrafootnotefeatures,displaymathdigits=persian]{xepersian}

\graphicspath{{../figures/}{../figures/logos/}}

% Pinned, Unicode-complete Nazanin faces for Persian text.
\settextfont[
  Path=vendor/irfonts/ttf/,
  UprightFont={IRNazanin.ttf},
  BoldFont={IRNazanin-Bold.ttf},
  ItalicFont={IRNazanin-Italic.ttf},
  BoldItalicFont={IRNazanin-Bold.ttf},
  BoldItalicFeatures={FakeSlant=0.2}
]{IRNazanin}
\settextdigitfont[
  Path=vendor/irfonts/ttf/,
  UprightFont={IRNazanin.ttf},
  BoldFont={IRNazanin-Bold.ttf}
]{IRNazanin}
% Portable default. To opt in, define \ThesisLatinFont before \documentclass.
\ifdefined\ThesisLatinFont
  \setlatintextfont[Scale=0.857142857]{\ThesisLatinFont}
  \deflatinfont\thesislatinfont{\ThesisLatinFont}
\else
  \setlatintextfont[Path=vendor/tex-gyre/,UprightFont=texgyretermes-regular.otf,
    BoldFont=texgyretermes-bold.otf,ItalicFont=texgyretermes-italic.otf,
    BoldItalicFont=texgyretermes-bolditalic.otf,Scale=0.857142857]{TeX Gyre Termes}
  \deflatinfont\thesislatinfont[Path=vendor/tex-gyre/,UprightFont=texgyretermes-regular.otf,
    BoldFont=texgyretermes-bold.otf,ItalicFont=texgyretermes-italic.otf,
    BoldItalicFont=texgyretermes-bolditalic.otf]{TeX Gyre Termes}
\fi

% Keep Persian numeric runs left-to-right without switching their glyphs to
% the Latin text font.  In particular, this preserves the distinct U+066B
% Arabic decimal separator supplied by the Persian font.
\newcommand{\thesisnum}[1]{\lr{\persianfont #1}}

\makeatletter

% --------------------------------------------------------------------------
% Public metadata interface
% --------------------------------------------------------------------------
\def\utthesis@universityfa{دانشگاه تهران}
\def\utthesis@collegefa{}
\def\utthesis@facultyfa{}
\def\utthesis@degreefa{کارشناسی ارشد}
\def\utthesis@subjectfa{}
\def\utthesis@fieldfa{}
\def\utthesis@titlefa{}
\def\utthesis@authorfa{}
\def\utthesis@studentid{}
\def\utthesis@datefa{}
\def\utthesis@supervisorfa{}
\def\utthesis@supervisorrankfa{}
\def\utthesis@advisorfa{}
\def\utthesis@advisoronefa{}
\def\utthesis@advisortwofa{}
\def\utthesis@advisoronerankfa{}
\def\utthesis@advisortworankfa{}
\def\utthesis@advisoroneaffiliationfa{}
\def\utthesis@advisortwoaffiliationfa{}
\def\utthesis@internaljudgefa{}
\def\utthesis@internaljudgerankfa{}
\def\utthesis@externaljudgefa{}
\def\utthesis@externaljudgerankfa{}
\def\utthesis@graduatedeputyfa{}
\def\utthesis@graduatedeputyrankfa{}
\def\utthesis@keywordsfa{}
\def\utthesis@universityen{University of Tehran}
\def\utthesis@collegeen{}
\def\utthesis@facultyen{}
\def\utthesis@degreeen{Master of Science}
\def\utthesis@subjecten{}
\def\utthesis@fielden{}
\def\utthesis@titleen{}
\def\utthesis@authoren{}
\def\utthesis@dateen{}
\def\utthesis@supervisoren{}
\def\utthesis@advisoren{}
\def\utthesis@advisoroneen{}
\def\utthesis@advisortwoen{}
\def\utthesis@keywordsen{}

\newif\ifThesisIncludeBesm
\newif\ifThesisIncludeDefense
\newif\ifThesisIncludeOriginality
\newif\ifThesisIncludeAIReport
\newif\ifThesisIncludeDedication
\newif\ifThesisIncludeAcknowledgements
\newif\ifThesisIncludeTables
\newif\ifThesisIncludeFigures
\newif\ifThesisIncludeEnglishPages
\ThesisIncludeBesmtrue
\ThesisIncludeDefensetrue
\ThesisIncludeOriginalitytrue
\ThesisIncludeAIReporttrue
\ThesisIncludeDedicationtrue
\ThesisIncludeAcknowledgementstrue
\ThesisIncludeTablestrue
\ThesisIncludeFigurestrue
\ThesisIncludeEnglishPagestrue

\pgfkeys{
  /utthesis/.is family,
  /utthesis,
  university-fa/.store in=\utthesis@universityfa,
  college-fa/.store in=\utthesis@collegefa,
  faculty-fa/.store in=\utthesis@facultyfa,
  degree-fa/.store in=\utthesis@degreefa,
  subject-fa/.store in=\utthesis@subjectfa,
  field-fa/.store in=\utthesis@fieldfa,
  title-fa/.store in=\utthesis@titlefa,
  author-fa/.store in=\utthesis@authorfa,
  student-id/.store in=\utthesis@studentid,
  date-fa/.store in=\utthesis@datefa,
  supervisor-fa/.store in=\utthesis@supervisorfa,
  supervisor-rank-fa/.store in=\utthesis@supervisorrankfa,
  advisor-fa/.store in=\utthesis@advisorfa,
  advisor-one-fa/.store in=\utthesis@advisoronefa,
  advisor-two-fa/.store in=\utthesis@advisortwofa,
  advisor-one-rank-fa/.store in=\utthesis@advisoronerankfa,
  advisor-two-rank-fa/.store in=\utthesis@advisortworankfa,
  advisor-one-affiliation-fa/.store in=\utthesis@advisoroneaffiliationfa,
  advisor-two-affiliation-fa/.store in=\utthesis@advisortwoaffiliationfa,
  internal-judge-fa/.store in=\utthesis@internaljudgefa,
  internal-judge-rank-fa/.store in=\utthesis@internaljudgerankfa,
  external-judge-fa/.store in=\utthesis@externaljudgefa,
  external-judge-rank-fa/.store in=\utthesis@externaljudgerankfa,
  graduate-deputy-fa/.store in=\utthesis@graduatedeputyfa,
  graduate-deputy-rank-fa/.store in=\utthesis@graduatedeputyrankfa,
  keywords-fa/.store in=\utthesis@keywordsfa,
  university-en/.store in=\utthesis@universityen,
  college-en/.store in=\utthesis@collegeen,
  faculty-en/.store in=\utthesis@facultyen,
  degree-en/.store in=\utthesis@degreeen,
  subject-en/.store in=\utthesis@subjecten,
  field-en/.store in=\utthesis@fielden,
  title-en/.store in=\utthesis@titleen,
  author-en/.store in=\utthesis@authoren,
  date-en/.store in=\utthesis@dateen,
  supervisor-en/.store in=\utthesis@supervisoren,
  advisor-en/.store in=\utthesis@advisoren,
  advisor-one-en/.store in=\utthesis@advisoroneen,
  advisor-two-en/.store in=\utthesis@advisortwoen,
  keywords-en/.store in=\utthesis@keywordsen,
  include-besm/.is if=ThesisIncludeBesm,
  include-defense/.is if=ThesisIncludeDefense,
  include-originality/.is if=ThesisIncludeOriginality,
  include-ai-report/.is if=ThesisIncludeAIReport,
  include-dedication/.is if=ThesisIncludeDedication,
  include-acknowledgements/.is if=ThesisIncludeAcknowledgements,
  include-list-of-tables/.is if=ThesisIncludeTables,
  include-list-of-figures/.is if=ThesisIncludeFigures,
  include-english-pages/.is if=ThesisIncludeEnglishPages
}
\newcommand{\thesissetup}[1]{\pgfkeys{/utthesis/.cd,#1}}

% Structured advisor fields take precedence.  The legacy combined fields are
% retained only as a fallback for older metadata files.
\newcommand{\thesisadvisoronefa}{%
  \ifstrempty{\utthesis@advisoronefa}{\utthesis@advisorfa}{\utthesis@advisoronefa}}
\newcommand{\thesisadvisortwofa}{\utthesis@advisortwofa}
\newcommand{\thesisadvisoroneen}{%
  \ifstrempty{\utthesis@advisoroneen}{\utthesis@advisoren}{\utthesis@advisoroneen}}
\newcommand{\thesisadvisortwoen}{\utthesis@advisortwoen}

% --------------------------------------------------------------------------
% Typography, numbering, and folios
% --------------------------------------------------------------------------
\renewcommand\normalsize{\@setfontsize\normalsize{14pt}{1cm}}
\renewcommand\small{\@setfontsize\small{12pt}{16pt}}
\renewcommand\footnotesize{\@setfontsize\footnotesize{11pt}{14pt}}
% Flexible page bottoms avoid forcing dense tables and glossary blocks a few
% points beyond the prescribed bottom margin.  This changes neither content
% nor the type scale and is the conventional choice for figure-heavy theses.
\AtBeginDocument{\normalsize\raggedbottom}
\setlength{\parindent}{1cm}
\setlength{\parskip}{0pt}
\setlength{\emergencystretch}{3em}
\hfuzz=2pt

% The approved sequence has no deliberately inserted verso leaves.
\renewcommand{\cleardoublepage}{\clearpage}

\newcommand{\thesisheadingnumber}[1]{{\persianfont #1}}
\titleformat{\section}
  {\bfseries\fontsize{16pt}{21pt}\selectfont}
  {\thesisheadingnumber{\thesection}}{0.75em}{}
\titlespacing*{\section}{0pt}{1cm}{0.5cm}
\titleformat{\subsection}
  {\bfseries\fontsize{15pt}{20pt}\selectfont}
  {\thesisheadingnumber{\thesubsection}}{0.75em}{}
\titlespacing*{\subsection}{0pt}{0.75cm}{0.4cm}
\titleformat{\subsubsection}
  {\bfseries\fontsize{14pt}{19pt}\selectfont}
  {\thesisheadingnumber{\thesubsubsection}}{0.75em}{}
\titlespacing*{\subsubsection}{0pt}{0.6cm}{0.3cm}
\setcounter{secnumdepth}{3}
% The printed contents stops at subsection (chapter-section-subsection).
% Subsubsections remain numbered and referenceable in the thesis body.
\setcounter{tocdepth}{2}

\newcommand{\thesisabjadfolio}[1]{%
  \ifcase#1\or الف\or ب\or ج\or د\or ه\or و\or ز\or ح\or ط\or ی\or ک\or ل\or م\or ن\or س\or ع\or ف\or ص\or ق\or ر\or ش\or ت\or ث\or خ\or ذ\or ض\or ظ\or غ\else #1\fi}
\newcommand{\thesisappendixletter}[1]{%
  \ifcase#1\or الف\or ب\or پ\or ت\or ث\or ج\or چ\or ح\or خ\or د\or ذ\or ر\or ز\or ژ\or س\or ش\or ص\or ض\or ط\or ظ\or ع\or غ\or ف\or ق\or ک\or گ\or ل\or م\or ن\or و\or ه\or ی\else #1\fi}
\newcommand{\thesischapterordinal}[1]{%
  \ifcase#1\or اول\or دوم\or سوم\or چهارم\or پنجم\or ششم\or هفتم\or هشتم\or نهم\or دهم\else #1\fi}
\newcommand{\thesisstartlistpages}{%
  \pagenumbering{arabic}%
  \renewcommand{\thepage}{\thesisabjadfolio{\value{page}}}%
}
\renewcommand{\thesection}{\thechapter-\arabic{section}}
\renewcommand{\thesubsection}{\thechapter-\arabic{section}-\arabic{subsection}}
\renewcommand{\thesubsubsection}{\thechapter-\arabic{section}-\arabic{subsection}-\arabic{subsubsection}}
% In RTL prose and captions the chapter is read before the local counter.
\renewcommand{\thefigure}{\thechapter-\arabic{figure}}
\renewcommand{\thetable}{\thechapter-\arabic{table}}
\renewcommand{\theequation}{\arabic{equation}-\thechapter}

\newif\ifthesisappendixmode
\thesisappendixmodefalse
\let\thesis@bookappendix\appendix
\renewcommand{\appendix}{\thesis@bookappendix\thesisappendixmodetrue}

\newcommand{\thesismainchaptertocentry}[2]{%
  فصل\space\thesischapterordinal{#1}:\space #2}

% Keep internal chapter counters numeric while writing the approved ordinal
% wording to the contents and, through that entry, to the PDF outline.
\def\@chapter[#1]#2{%
  \ifnum \c@secnumdepth >\m@ne
    \if@mainmatter
      \refstepcounter{chapter}%
      \typeout{\@chapapp\space\thechapter.}%
      \ifthesisappendixmode
        \addcontentsline{toc}{chapter}{\protect\numberline{\thechapter}#1}%
      \else
        \addcontentsline{toc}{chapter}{%
          \protect\thesismainchaptertocentry{\number\c@chapter}{#1}}%
      \fi
    \else
      \addcontentsline{toc}{chapter}{#1}%
    \fi
  \else
    \addcontentsline{toc}{chapter}{#1}%
  \fi
  \chaptermark{#1}%
  \addtocontents{lof}{\protect\addvspace{10\p@}}%
  \addtocontents{lot}{\protect\addvspace{10\p@}}%
  \if@twocolumn
    \@topnewpage[\@makechapterhead{#2}]%
  \else
    \@makechapterhead{#2}%
    \@afterheading
  \fi}

% A numbered chapter/appendix opens on a counted title-only leaf.  The folio
% is suppressed on that leaf and prose starts after the internal clear page.
\def\@makechapterhead#1{%
  \thispagestyle{empty}%
  \null\vfill
  \begin{center}
    {\bfseries\fontsize{18pt}{24pt}\selectfont
      \ifthesisappendixmode
        \thesischapterprefix\space\thechapter
      \else
        \thesischapterprefix\space\thesischapterordinal{\value{chapter}}
      \fi\par}
    \vspace{1cm}
    {\bfseries\fontsize{18pt}{24pt}\selectfont #1\par}
  \end{center}
  \vfill\null
  \clearpage
}
\def\@makeschapterhead#1{%
  \vspace*{0pt}%
  {\centering\bfseries\fontsize{18pt}{24pt}\selectfont #1\par}%
  \vspace{1cm}%
}

\fancypagestyle{thesismain}{%
  \fancyhf{}\fancyfoot[C]{\thepage}%
  \renewcommand{\headrulewidth}{0pt}\renewcommand{\footrulewidth}{0pt}}
\fancypagestyle{thesisfront}{%
  \fancyhf{}\fancyfoot[C]{\thepage}%
  \renewcommand{\headrulewidth}{0pt}\renewcommand{\footrulewidth}{0pt}}
\fancypagestyle{plain}{%
  \fancyhf{}\fancyfoot[C]{\thepage}%
  \renewcommand{\headrulewidth}{0pt}\renewcommand{\footrulewidth}{0pt}}

\renewcommand{\contentsname}{فهرست مطالب}
\renewcommand{\listfigurename}{فهرست نمودارها و شکل‌ها}
\renewcommand{\listtablename}{فهرست جدول‌ها}
\renewcommand{\bibname}{منابع و مآخذ}
\renewcommand{\figurename}{شکل}
\renewcommand{\tablename}{جدول}
\newcommand{\thesischapterprefix}{فصل}

\DeclareCaptionFont{thesiscaption}{\fontsize{14pt}{18pt}\selectfont}
\DeclareCaptionFont{thesislabel}{\bfseries\fontsize{15pt}{19pt}\selectfont}
\captionsetup{font=thesiscaption,labelfont=thesislabel,
  justification=centering,singlelinecheck=false}

% Hyperref's standard `linktoc=all` creates separate rectangles for the title
% and folio and leaves the dot leaders inert.  The bidi-aware renderers below
% open the link only after horizontal mode begins and close it after the page
% number, so wrapped lines and leaders are part of the same link operation.
\newcommand{\thesisinstalltoclinks}{%
  \renewcommand{\contentsline}[4]{%
    \def\thesis@tocdest{##4}%
    \csname l@##1\endcsname{##2}{##3}}%
  \def\thesis@toclinkstart{%
    \ifdefempty{\thesis@tocdest}{}{\hyper@linkstart{link}{\thesis@tocdest}}}%
  \def\thesis@toclinkend{%
    \ifdefempty{\thesis@tocdest}{}{\hyper@linkend}}%
  \def\@dottedtocline##1##2##3##4##5{%
    \ifnum ##1>\c@tocdepth \else
      \vskip \z@ \@plus.2\p@
      \def\thesis@tocentryfont{}%
      \ifnum ##1=2\relax
        \def\thesis@tocentryfont{\fontsize{12pt}{16pt}\selectfont}%
      \fi
      \setbox\z@=\vbox{\hsize=\textwidth
        {\thesis@tocentryfont
         \if@RTL\rightskip\else\leftskip\fi ##2\relax
         \if@RTL\leftskip\else\rightskip\fi \@tocrmarg
         \parfillskip -\if@RTL\leftskip\else\rightskip\fi
         \parindent ##2\relax\@afterindenttrue
         \interlinepenalty\@M
         \leavevmode
         \@tempdima ##3\relax
         \advance\if@RTL\rightskip\else\leftskip\fi \@tempdima
         % Outdent only the number box in RTL, preserving the right-side
         % hierarchy indent.  The folio itself is overlaid below.
         \null\nobreak\hskip \if@RTL-\@tempdima\else-\leftskip\fi
         {##4}\nobreak
         \leaders\hbox{$\m@th\mkern \@dotsep mu\hbox{.}\mkern \@dotsep mu$}\hfill
         \nobreak
         \hb@xt@\@pnumwidth{{\hfil\normalfont\normalcolor
           \if@RTL\phantom{##5}\else ##5\fi}}\par}}%
      \if@RTL
        % Decouple the folio from bidi's logical indentation: overlay it at
        % one fixed physical-left origin for every hierarchy level.
        \setbox\tw@=\box\z@
        \setbox\z@=\hboxL{%
          \rlap{\hb@xt@\textwidth{%
            \hboxR{\thesis@tocentryfont
              \normalfont\normalcolor ##5}\hfil}}%
          \box\tw@}%
      \fi
      \noindent\thesis@toclinkstart\XeTeXLinkBox{\box\z@}\thesis@toclinkend\par
    \fi}%
  \renewcommand*\l@chapter[2]{%
    \ifnum \c@tocdepth >\m@ne
      \addpenalty{-\@highpenalty}%
      \vskip 0.6em \@plus.5\p@
      \setlength\@tempdima{1.5em}%
      \setbox\z@=\vbox{\hsize=\textwidth
        \begingroup
          \parindent \z@ \if@RTL\leftskip\else\rightskip\fi \@pnumwidth
          \parfillskip -\@pnumwidth
          \leavevmode \bfseries
          \advance\if@RTL\rightskip\else\leftskip\fi\@tempdima
          \hskip -\if@RTL\rightskip\else\leftskip\fi
          ##1\nobreak\hfil \nobreak\hb@xt@\@pnumwidth{\hss ##2}\par
        \endgroup}%
      \noindent\thesis@toclinkstart\XeTeXLinkBox{\box\z@}\thesis@toclinkend\par
      \penalty\@highpenalty
    \fi}}
\AddToHook{begindocument/end}{\thesisinstalltoclinks}

% Native list commands place the destination and ToC entry after \chapter*
% has opened the actual list page.  This keeps both the displayed Abjad folio
% and the clickable target aligned with the list heading.
% Suppress the chapter-boundary \addvspace records while reading the figure
% and table lists so every entry uses the same vertical rhythm.  The records
% remain in the auxiliary files and therefore retain the standard chapter
% behaviour if those files are consumed elsewhere.
\newcommand{\thesis@startuniformlist}[1]{%
  \begingroup
  \let\addvspace\@gobble
  % Preserve the approved list-number layout independently of body references.
  \let\thesis@listnumberline\numberline
  \def\thesis@listnumber##1-##2\@nil{\thesis@listnumberline{##2-##1}}%
  \def\numberline##1{\thesis@listnumber##1\@nil}%
  \@starttoc{#1}%
  \endgroup}
\newcommand{\ThesisListOfTables}{%
  \begingroup\fontsize{14pt}{24pt}\selectfont
  \chapter*{فهرست جدول‌ها}%
  \phantomsection\addcontentsline{toc}{chapter}{فهرست جدول‌ها}%
  \thesis@startuniformlist{lot}%
  \endgroup}
\newcommand{\ThesisListOfFigures}{%
  \begingroup\fontsize{14pt}{24pt}\selectfont
  \chapter*{فهرست نمودارها و شکل‌ها}%
  \phantomsection\addcontentsline{toc}{chapter}{فهرست نمودارها و شکل‌ها}%
  \thesis@startuniformlist{lof}%
  \endgroup}

% --------------------------------------------------------------------------
% Preliminary and closing page helpers
% --------------------------------------------------------------------------
\newcommand{\ThesisLogoHeader}{%
  \begingroup\setLTRtable\setlength{\tabcolsep}{0pt}%
  \begin{tabular}{>{\centering\arraybackslash}m{0.25\textwidth}>{\centering\arraybackslash}m{0.50\textwidth}>{\centering\arraybackslash}m{0.25\textwidth}}
    \includegraphics[width=2.7cm]{eng-logo.png} &
    {\bfseries\fontsize{14pt}{19pt}\selectfont
      \utthesis@universityfa\par\utthesis@collegefa\par\utthesis@facultyfa\par} &
    \includegraphics[width=2.7cm]{logo.png}
  \end{tabular}\endgroup
}

% The outer Persian cover and the inner Persian title page intentionally share
% one geometry so their baselines and physical centering cannot drift apart.
\newcommand{\ThesisPersianTitleLayout}{%
  \thispagestyle{empty}\centering
  \ThesisLogoHeader\par
  \vspace{14mm}
  {\fontsize{14pt}{19pt}\selectfont
    پایان‌نامه برای دریافت درجه \utthesis@degreefa\par
    رشته \utthesis@subjectfa\par
    \ifdefempty{\utthesis@fieldfa}{}{گرایش \utthesis@fieldfa\par}}
  \vspace{10mm}
  {\bfseries\fontsize{18pt}{24pt}\selectfont
    \parbox{0.86\textwidth}{\centering\utthesis@titlefa\par}\par}
  \vspace{12mm}
  {\fontsize{14pt}{19pt}\selectfont نگارنده\par\utthesis@authorfa\par}
  \vspace{8mm}
  {\fontsize{14pt}{19pt}\selectfont استاد راهنما\par\utthesis@supervisorfa\par}
  \vspace{6mm}
  \ifdefempty{\utthesis@advisoronefa}{%
    \ifdefempty{\utthesis@advisorfa}{}{%
      {\fontsize{14pt}{19pt}\selectfont استادان مشاور\par\utthesis@advisorfa\par}}%
  }{%
    {\fontsize{14pt}{19pt}\selectfont
      استادان مشاور\par
      \utthesis@advisoronefa\par
      \ifdefempty{\utthesis@advisortwofa}{}{\utthesis@advisortwofa\par}}}
  \vfill
  {\fontsize{14pt}{19pt}\selectfont\utthesis@datefa\par}}

\newcommand{\ThesisPersianCoverPage}{%
  \begin{titlepage}\ThesisPersianTitleLayout\end{titlepage}}

\newcommand{\ThesisBesmPage}{%
  \clearpage\thispagestyle{empty}\null\vfill
  \begin{center}{\bfseries\fontsize{18pt}{24pt}\selectfont بسم الله الرحمن الرحیم}\end{center}
  \vfill\null\clearpage}

\newcommand{\ThesisPersianTitlePage}{%
  \begin{titlepage}\ThesisPersianTitleLayout\end{titlepage}}

\newcommand{\ThesisDefenseCertificatePage}{%
  \clearpage\thispagestyle{empty}\begingroup
  \setlength{\parindent}{0pt}\fontsize{11pt}{15pt}\selectfont
  \begin{center}\ThesisLogoHeader\vspace{0.45cm}
    {\bfseries\fontsize{17pt}{22pt}\selectfont گواهی دفاع از پایان‌نامه کارشناسی ارشد\par}
  \end{center}
  \vspace{0.3cm}
  \begingroup\fontsize{11pt}{18pt}\selectfont
  هیئت داوران پایان‌نامه کارشناسی ارشد آقای \utthesis@authorfa{} به شماره دانشجویی
  \utthesis@studentid{} در رشته \utthesis@subjectfa{}%
  \ifdefempty{\utthesis@fieldfa}{}{ -- گرایش \utthesis@fieldfa{}}%
  \space را در تاریخ \utthesis@datefa{} با عنوان «\utthesis@titlefa»
  \par\endgroup
  \vspace{0.1cm}
  % The score fields follow the official certificate's standalone form: the
  % numeric and written scores share one row, followed by the degree field.
  \noindent\makebox[\textwidth][l]{%
    \parbox{0.72\textwidth}{%
      \makebox[1.65cm]{}\hspace{1ex}\makebox[2cm]{به عدد}\makebox[5cm]{به حروف}\par
      \makebox[1.65cm][r]{با نمره نهایی}\hspace{1ex}%
      \framebox[2cm]{\rule{0pt}{0.75cm}}\framebox[5cm]{\rule{0pt}{0.75cm}}\par
      \vspace{0.28cm}%
      \makebox[1.1cm][r]{و درجه}\hspace{1ex}%
      \framebox[3cm]{\rule{0pt}{0.75cm}}\hspace{1ex}\makebox[1.7cm][l]{ارزیابی کرد.}}}
  \vspace{0.55cm}
  \begin{center}\begingroup\setLTRtable\setlength{\tabcolsep}{2.5pt}\renewcommand{\arraystretch}{1.55}
  \begin{tabularx}{\textwidth}{|>{\centering\arraybackslash}X|>{\centering\arraybackslash}p{29mm}|>{\centering\arraybackslash}p{18mm}|>{\centering\arraybackslash}p{29mm}|>{\centering\arraybackslash}p{26mm}|>{\centering\arraybackslash}p{8mm}|}
  \hline
  \textbf{امضا}&\textbf{دانشگاه یا مؤسسه}&\textbf{مرتبه دانشگاهی}&\textbf{نام و نام خانوادگی}&\textbf{سمت}&\textbf{ردیف}\\\hline
  &&\utthesis@supervisorrankfa&\utthesis@supervisorfa&استاد راهنما&۱\\\hline
  &\utthesis@advisoroneaffiliationfa&\utthesis@advisoronerankfa&\thesisadvisoronefa&\multirow{2}{*}{\parbox{26mm}{\centering استاد مشاور}}&۲\\\cline{1-4}\cline{6-6}
  &\utthesis@advisortwoaffiliationfa&\utthesis@advisortworankfa&\thesisadvisortwofa&&۳\\\hline
  &&\utthesis@internaljudgerankfa&\utthesis@internaljudgefa&استاد داور داخلی&۴\\\hline
  &&\utthesis@externaljudgerankfa&\utthesis@externaljudgefa&استاد داور خارجی یا مدعو&۵\\\hline
  &&\utthesis@graduatedeputyrankfa&\utthesis@graduatedeputyfa&نماینده تحصیلات تکمیلی&۶\\\hline
  \end{tabularx}\endgroup\end{center}
  \vspace{0.85cm}
  \begin{center}\begingroup\setLTRtable\setlength{\tabcolsep}{0pt}
  \begin{tabularx}{\textwidth}{@{}>{\centering\arraybackslash}X@{\hspace{8mm}}>{\centering\arraybackslash}X@{}}
  نام و نام خانوادگی معاون آموزشی و تحصیلات تکمیلی \utthesis@collegefa:\par\vspace{1mm}تاریخ و امضا:
  & نام و نام خانوادگی معاون تحصیلات تکمیلی و پژوهشی \utthesis@facultyfa:\par\vspace{1mm}تاریخ و امضا:
  \end{tabularx}\endgroup\end{center}
  \endgroup\clearpage}

\newcommand{\ThesisOriginalityPage}{%
  \clearpage\thispagestyle{empty}\vspace*{1cm}
  \begin{center}
    {\bfseries\fontsize{14pt}{19pt}\selectfont بسمه تعالی\par}\vspace{0.7cm}
    {\bfseries\fontsize{17pt}{22pt}\selectfont تعهدنامه اصالت اثر\par}
  \end{center}\vspace{0.8cm}
  \noindent اینجانب \utthesis@authorfa{} گواهی و تعهد می‌دهم که مطالب مندرج در این
  پایان‌نامه، حاصل کار پژوهشی اینجانب است و به دستاوردهای پژوهشی دیگران که در این
  پژوهش از آن‌ها استفاده شده، مطابق مقررات و اصول مرتبط با درج منابع و مآخذ، ارجاع
  داده‌ام. این پایان‌نامه قبلاً برای دریافت هیچ مدرک تحصیلی دیگری ارائه نشده است.
  ضمن پایبندی به رعایت مقررات و اصول اخلاق در پژوهش، می‌پذیرم که در هر زمانی خلاف
  این گواهی اثبات شود، دانشگاه تهران حق دارد مدرک تحصیلی صادرشده را از درجه اعتبار
  ساقط نماید.
  \vspace{0.9cm}\par\noindent\textbf{کلیه حقوق مادی و معنوی این اثر متعلق به دانشگاه تهران است.}\par
  \vspace{1.2cm}\noindent نام و نام خانوادگی دانشجو: \utthesis@authorfa\par
  \vspace{0.5cm}\noindent امضا:\par\vspace{0.5cm}\noindent تاریخ:\vfill\clearpage}

\newcommand{\ThesisContentPage}[2]{%
  \clearpage\thispagestyle{empty}
  \begin{center}{\bfseries\fontsize{16pt}{21pt}\selectfont #1}\end{center}
  \vspace{0.8cm}\input{#2}\vfill\clearpage}

\newcommand{\ThesisPersianAbstractPage}{%
  \clearpage\thispagestyle{empty}
  \begingroup\fontsize{14pt}{24pt}\selectfont
  \begin{center}{\bfseries\fontsize{16pt}{21pt}\selectfont چکیده}\end{center}
  \vspace{0.5cm}\input{front-matter/abstract-fa.tex}\vfill
  \noindent\textbf{واژگان کلیدی:} \utthesis@keywordsfa\par\endgroup\clearpage}

\newcommand{\ThesisEnglishAbstractPage}{%
  \clearpage\thispagestyle{empty}
  \begin{latin}\thesislatinfont\fontsize{12pt}{18pt}\selectfont
  \begin{center}{\bfseries\fontsize{16pt}{21pt}\selectfont\utthesis@titleen\par}
  \vspace{0.8cm}{\bfseries\fontsize{14pt}{18pt}\selectfont Abstract\par}\end{center}
  \vspace{0.5cm}\input{front-matter/abstract-en.tex}\vfill
  \noindent\textbf{Keywords:} \utthesis@keywordsen
  \end{latin}\clearpage}

\newcommand{\ThesisEnglishTitlePage}{%
  \thispagestyle{empty}\begin{latin}\thesislatinfont\fontsize{12pt}{16pt}\selectfont\centering
  \begingroup\setlength{\tabcolsep}{0pt}
  \begin{tabular}{>{\centering\arraybackslash}m{0.25\textwidth}>{\centering\arraybackslash}m{0.50\textwidth}>{\centering\arraybackslash}m{0.25\textwidth}}
    \includegraphics[width=2.7cm]{eng-logo-en.png} &
    {\bfseries\fontsize{14pt}{19pt}\selectfont\utthesis@universityen\par\utthesis@collegeen\par\utthesis@facultyen\par} &
    \includegraphics[width=2.7cm]{logo-en.png}
  \end{tabular}\endgroup
  \vspace{1.5cm}
  {\fontsize{14pt}{18pt}\selectfont A Thesis Submitted for the Degree of \utthesis@degreeen\ in \utthesis@subjecten\par}
  \vspace{1.5cm}{\bfseries\fontsize{16pt}{21pt}\selectfont
    \parbox{0.86\textwidth}{\centering\utthesis@titleen\par}\par}
  \vspace{1.2cm}{\fontsize{12pt}{16pt}\selectfont by\par}
  {\fontsize{14pt}{18pt}\selectfont\utthesis@authoren\par}
  \vspace{1cm}{\fontsize{12pt}{16pt}\selectfont Supervisor\par}
  {\fontsize{14pt}{18pt}\selectfont\utthesis@supervisoren\par}
  \ifdefempty{\utthesis@advisoroneen}{%
    \ifdefempty{\utthesis@advisoren}{}{\vspace{0.7cm}{\fontsize{12pt}{16pt}\selectfont Advisors\par}
      {\fontsize{14pt}{18pt}\selectfont\utthesis@advisoren\par}}%
  }{\vspace{0.7cm}{\fontsize{12pt}{16pt}\selectfont Advisors\par}
    {\fontsize{14pt}{18pt}\selectfont\utthesis@advisoroneen\par
      \ifdefempty{\utthesis@advisortwoen}{}{\utthesis@advisortwoen\par}}}
  \vfill\utthesis@dateen\end{latin}\clearpage}

% --------------------------------------------------------------------------
% Bibliography, glossary, and specialized authoring helpers
% --------------------------------------------------------------------------
\DeclareRobustCommand{\ThesisTermFirst}[2]{#1\LTRfootnote{\lr{#2}}}
\newglossarystyle{thesisfaen}{%
  \renewenvironment{theglossary}{%
    \begingroup\fontsize{12pt}{17pt}\selectfont
    \begin{longtable}{@{}>{\raggedright\arraybackslash}p{0.44\linewidth}>{\raggedright\arraybackslash}p{0.51\linewidth}@{}}%
  }{\end{longtable}\endgroup}%
  \renewcommand*{\glossaryheader}{}%
  \renewcommand*{\glossentry}[2]{%
    \glstarget{##1}{\glossentryname{##1}} & \lr{\glossentrydesc{##1}}\\}%
  \renewcommand*{\subglossentry}[3]{\glossentry{##2}{##3}}}
\newglossarystyle{thesisenfa}{%
  \renewenvironment{theglossary}{%
    \begingroup\fontsize{10.5pt}{13pt}\selectfont
    \setlength{\columnsep}{8mm}%
    \setlength{\multicolsep}{0pt}%
    \begin{multicols}{2}\raggedcolumns
  }{\end{multicols}\endgroup}%
  \renewcommand*{\glossaryheader}{}%
  \renewcommand*{\glossentry}[2]{%
    \par\noindent
    \glstarget{##1}{{\bfseries\lr{\glossentryname{##1}}}}\par\nobreak
    {\raggedleft\glossentrydesc{##1}\par}\vspace{1pt}}%
  \renewcommand*{\subglossentry}[3]{\glossentry{##2}{##3}}}
\newglossarystyle{thesisacronyms}{%
  \renewenvironment{theglossary}{%
    \begingroup\fontsize{10.5pt}{13pt}\selectfont\setLTRtable
    \setlength{\tabcolsep}{4pt}%
    \setlength{\LTleft}{-4mm}%
    \setlength{\LTright}{-4mm}%
    \begin{longtable}{@{}>{\raggedleft\arraybackslash}p{0.42\linewidth}>{\raggedright\arraybackslash}p{0.45\linewidth}>{\centering\arraybackslash}p{0.145\linewidth}@{}}%
  }{\bottomrule\end{longtable}\endgroup}%
  \renewcommand*{\glossaryheader}{%
    \toprule
    \textbf{معادل فارسی} & \textbf{عبارت کامل انگلیسی} & \textbf{علامت/مخفف}\\
    \midrule\endhead}%
  \renewcommand*{\glsgroupskip}{}%
  \renewcommand*{\glossentry}[2]{%
    {\fontsize{10pt}{12pt}\selectfont\glsentryuseri{##1}} & \lr{\glossentrydesc{##1}} &
    \glstarget{##1}{\bfseries\lr{\glossentryname{##1}}}\\}%
  \renewcommand*{\subglossentry}[3]{\glossentry{##2}{##3}}}

\newenvironment{ThesisLandscape}{\clearpage\begin{landscape}}{\end{landscape}\clearpage}
\newenvironment{ThesisCompactQuestionnaire}{\begingroup\small\setlength{\parindent}{0pt}\setlength{\parskip}{3pt}}{\endgroup}
\newenvironment{ThesisCompactSubsections}{%
  \begingroup\setlength{\baselineskip}{0.98cm}%
  \titlespacing*{\subsection}{0pt}{0.45cm}{0.2cm}%
}{\par\endgroup}
\newenvironment{ThesisTableNotes}{\par\medskip\begin{minipage}{\linewidth}\footnotesize}{\end{minipage}\par}

% Charts and figures share the chapter-based figure counter and the same
% combined list, while their visible caption labels remain semantically exact.
\newenvironment{ThesisChart}{%
  \begin{figure}\renewcommand{\figurename}{نمودار}%
}{\end{figure}}

% Compatibility helpers retained for the mechanically migrated Pandoc tables.
\providecommand{\tightlist}{\setlength{\itemsep}{0pt}\setlength{\parskip}{0pt}}
\def\maxwidth{\ifdim\Gin@nat@width>\linewidth\linewidth\else\Gin@nat@width\fi}
\def\maxheight{\ifdim\Gin@nat@height>\textheight\textheight\else\Gin@nat@height\fi}
\patchcmd\longtable{\par}{\if@noskipsec\mbox{}\fi\par}{}{}
\setkeys{Gin}{width=\maxwidth,height=\maxheight,keepaspectratio}
\floatplacement{figure}{H}

\AtBeginDocument{%
  \hypersetup{
    pdftitle={\utthesis@titleen},
    pdfauthor={\utthesis@authoren},
    pdfsubject={Thesis in \utthesis@subjecten},
    pdfkeywords={\utthesis@keywordsen}}
}

\newcommand{\ThesisMetadata}[1]{\csname utthesis@#1\endcsname}
\makeatother
\endinput
