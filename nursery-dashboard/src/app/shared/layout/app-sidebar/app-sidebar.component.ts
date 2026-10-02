import { CommonModule } from '@angular/common';

import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  ChangeDetectorRef
} from '@angular/core';

import { SidebarService } from '../../services/sidebar.service';

import {
  NavigationEnd,
  Router,
  RouterModule
} from '@angular/router';

import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';

import {
  combineLatest,
  Subscription
} from 'rxjs';


type NavItem = {

  name: string;

  icon: string;

  path?: string;

  new?: boolean;

  subItems?: {
    name: string;
    path: string;
    pro?: boolean;
    new?: boolean;
  }[];

};


@Component({

  selector: 'app-sidebar',

  imports: [
    CommonModule,
    RouterModule,
    SafeHtmlPipe
  ],

  templateUrl: './app-sidebar.component.html',

})


export class AppSidebarComponent {

  // =========================================================
  // MAIN NAV ITEMS
  // =========================================================

  navItems: NavItem[] = [

    // =========================================================
    // DASHBOARD
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z"
            fill="currentColor"
          ></path>
        </svg>
      `,

      name: 'Dashboard',

      path: '/dashboard'
    },


    // =========================================================
    // CATEGORIES
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14ZM14 14H20V20H14V14Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>
      `,

      name: 'Categories',

      subItems: [

        {
          name: 'All Categories',
          path: '/categories'
        },

        {
          name: 'Add Category',
          path: '/categories/add-category'
        }

      ]
    },


    // =========================================================
    // PRODUCTS
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 7L12 3L20 7L12 11L4 7Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />

          <path
            d="M4 7V17L12 21L20 17V7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />

          <path
            d="M12 11V21"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      `,

      name: 'Products',

      subItems: [

        {
          name: 'All Products',
          path: '/products'
        },

        {
          name: 'Add Product',
          path: '/products/add-product'
        },

        {
          name: 'Print Barcodes',
          path: '/products/print-barcodes'
        }

      ]
    },


    // =========================================================
    // SUPPLIERS
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 21V19C16 16.7909 14.2091 15 12 15H6C3.79086 15 2 16.7909 2 19V21"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <circle
            cx="9"
            cy="7"
            r="4"
            stroke="currentColor"
            stroke-width="1.5"
          />

          <path
            d="M17 11L19 13L23 9"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      `,

      name: 'Suppliers',

      subItems: [

        {
          name: 'All Suppliers',
          path: '/suppliers'
        },

        {
          name: 'Add Supplier',
          path: '/suppliers/add-supplier'
        }

      ]
    },


    // =========================================================
    // WAREHOUSES
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 21V9L12 3L21 9V21H3Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <path
            d="M7 21V13H17V21"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <path
            d="M9 16H15"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      `,

      name: 'Warehouses',

      subItems: [

        {
          name: 'All Warehouses',
          path: '/warehouses'
        },

        {
          name: 'Add Warehouse',
          path: '/warehouses/add-warehouse'
        }

      ]
    },


    // =========================================================
    // PURCHASES
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 3H18V21H6V3Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />

          <path
            d="M9 7H15"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M9 11H15"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M9 15H13"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      `,

      name: 'Purchases',

      subItems: [

        {
          name: 'All Purchases',
          path: '/purchases'
        },

        {
          name: 'Add Purchase',
          path: '/purchases/add-purchase'
        }

      ]
    },


    // =========================================================
    // STOCK TRANSFERS
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 7H17"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M14 4L17 7L14 10"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <path
            d="M20 17H7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M10 14L7 17L10 20"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <rect
            x="3"
            y="11"
            width="5"
            height="5"
            rx="1"
            stroke="currentColor"
            stroke-width="1.5"
          />

          <rect
            x="16"
            y="8"
            width="5"
            height="5"
            rx="1"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      `,

      name: 'Stock Transfers',

      subItems: [

        {
          name: 'All Stock Transfers',
          path: '/stock-transfers'
        },

        {
          name: 'Add Stock Transfer',
          path: '/stock-transfers/add-stock-transfer'
        }

      ]
    },


    // =========================================================
    // STOCK ADJUSTMENTS
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6H14"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M18 6H20"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <circle
            cx="16"
            cy="6"
            r="2"
            stroke="currentColor"
            stroke-width="1.5"
          />

          <path
            d="M4 12H7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M11 12H20"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <circle
            cx="9"
            cy="12"
            r="2"
            stroke="currentColor"
            stroke-width="1.5"
          />

          <path
            d="M4 18H12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M16 18H20"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <circle
            cx="14"
            cy="18"
            r="2"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      `,

      name: 'Stock Adjustments',

      subItems: [

        {
          name: 'All Stock Adjustments',
          path: '/stock-adjustments'
        },

        {
          name: 'Add Stock Adjustment',
          path: '/stock-adjustments/add-stock-adjustment'
        }

      ]
    },

    // =========================================================
    // SALES
    // =========================================================
      
    {
      icon: `
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 4H6L8.5 15H18.5L21 7H7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
    
          <circle
            cx="10"
            cy="19"
            r="1.5"
            stroke="currentColor"
            stroke-width="1.5"
          />
    
          <circle
            cx="18"
            cy="19"
            r="1.5"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      `,
    
      name: 'Sales',
    
      subItems: [
      
        {
          name: 'Sales History',
          path: '/sales'
        },
      
        {
          name: 'Create Sale',
          path: '/sales/create-sale'
        }
      
      ]
    },


    // =========================================================
    // CATEGORY CHART
    // =========================================================

    {
      icon: `
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 20V10"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M10 20V4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M16 20V13"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />

          <path
            d="M22 20H2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      `,

      name: 'Category Chart',

      path: '/category-chart'
    }

  ];


  // =========================================================
  // OTHER NAV ITEMS
  // =========================================================

  othersItems: NavItem[] = [];


  // =========================================================
  // SUBMENU STATE
  // =========================================================

  openSubmenu: string | null | number = null;

  subMenuHeights: {
    [key: string]: number
  } = {};


  @ViewChildren('subMenu')
  subMenuRefs!: QueryList<ElementRef>;


  // =========================================================
  // SIDEBAR OBSERVABLES
  // =========================================================

  readonly isExpanded$;

  readonly isMobileOpen$;

  readonly isHovered$;


  private subscription:
    Subscription = new Subscription();


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(

    public sidebarService: SidebarService,

    private router: Router,

    private cdr: ChangeDetectorRef

  ) {

    this.isExpanded$ =
      this.sidebarService.isExpanded$;

    this.isMobileOpen$ =
      this.sidebarService.isMobileOpen$;

    this.isHovered$ =
      this.sidebarService.isHovered$;

  }


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit() {

    this.subscription.add(

      this.router.events.subscribe(
        event => {

          if (
            event instanceof NavigationEnd
          ) {

            this.setActiveMenuFromRoute(
              this.router.url
            );

          }

        }
      )

    );


    this.subscription.add(

      combineLatest([

        this.isExpanded$,

        this.isMobileOpen$,

        this.isHovered$

      ]).subscribe(

        ([
          isExpanded,
          isMobileOpen,
          isHovered
        ]) => {

          if (
            !isExpanded &&
            !isMobileOpen &&
            !isHovered
          ) {

            this.cdr.detectChanges();

          }

        }

      )

    );


    this.setActiveMenuFromRoute(
      this.router.url
    );

  }


  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy() {

    this.subscription.unsubscribe();

  }


  // =========================================================
  // CHECK ACTIVE ROUTE
  // =========================================================

  isActive(
    path: string
  ): boolean {

    return this.router.url === path;

  }


  // =========================================================
  // TOGGLE SUBMENU
  // =========================================================

  toggleSubmenu(
    section: string,
    index: number
  ) {

    const key =
      `${section}-${index}`;


    if (
      this.openSubmenu === key
    ) {

      this.openSubmenu = null;

      this.subMenuHeights[key] = 0;

    }

    else {

      this.openSubmenu = key;


      setTimeout(() => {

        const el =
          document.getElementById(key);


        if (el) {

          this.subMenuHeights[key] =
            el.scrollHeight;

          this.cdr.detectChanges();

        }

      });

    }

  }


  // =========================================================
  // SIDEBAR HOVER
  // =========================================================

  onSidebarMouseEnter() {

    this.isExpanded$
      .subscribe(
        expanded => {

          if (!expanded) {

            this.sidebarService
              .setHovered(true);

          }

        }
      )
      .unsubscribe();

  }


  // =========================================================
  // SET ACTIVE MENU FROM CURRENT ROUTE
  // =========================================================

  private setActiveMenuFromRoute(
    currentUrl: string
  ) {

    const menuGroups = [

      {
        items: this.navItems,
        prefix: 'main'
      },

      {
        items: this.othersItems,
        prefix: 'others'
      }

    ];


    menuGroups.forEach(
      group => {

        group.items.forEach(
          (nav, i) => {

            if (nav.subItems) {

              nav.subItems.forEach(
                subItem => {

                  if (
                    currentUrl ===
                    subItem.path
                  ) {

                    const key =
                      `${group.prefix}-${i}`;


                    this.openSubmenu =
                      key;


                    setTimeout(() => {

                      const el =
                        document
                          .getElementById(
                            key
                          );


                      if (el) {

                        this.subMenuHeights[
                          key
                        ] =
                          el.scrollHeight;


                        this.cdr
                          .detectChanges();

                      }

                    });

                  }

                }
              );

            }

          }
        );

      }
    );

  }


  // =========================================================
  // SUBMENU CLICK
  // =========================================================

  onSubmenuClick() {

    console.log(
      'click submenu'
    );


    this.isMobileOpen$
      .subscribe(
        isMobile => {

          if (isMobile) {

            this.sidebarService
              .setMobileOpen(false);

          }

        }
      )
      .unsubscribe();

  }

}